import Selector, {CombinedSelector} from "./Selector";
import Column from "./Column";

export interface TableOptions {
    createTable?: boolean,
    createTableOptions?: CreateTableOptions,
    alterTable?: boolean,
    alterTableOptions?: AlterTableOptions
}

export interface CreateTableOptions {
    engine?: MySQLTableEngine
}

export enum MySQLTableEngine {
    InnoDB = "InnoDB"
}

export interface AlterTableOptions {
    addColumns?: boolean
    modifyColumns?: boolean
}

export interface SelectOptions {
    props?: string[]
}

export class Table {

    private readonly mysql
    public readonly name: string
    private readonly columns: Column[]
    public readonly createTable: boolean
    public readonly createTableOptions: CreateTableOptions
    public readonly alterTableOptions: AlterTableOptions
    public readonly alterTable: boolean
    private initialized: boolean


    public static create(mysql, name, columns, config) {
        return new Table(mysql, name, columns, config)
    }

    constructor(mysql, name, columns?: Column[], options?: TableOptions) {
        this.mysql = mysql
        this.name = name
        this.columns = columns || []

        this.createTable = options?.createTable || false
        this.createTableOptions = {
            engine: MySQLTableEngine.InnoDB,
            ...(options?.createTableOptions || {})
        }

        this.alterTable = options?.alterTable || false
        this.alterTableOptions = {
            addColumns: true,
            modifyColumns: true,
            ...(options?.alterTableOptions || {})
        }

        this.initialized = false
    }

    public async init() {
        if (this.initialized) return;
        if (this.createTable) await this.initCreateTable()
        if (this.alterTable) await this.initAlterTable(this.alterTableOptions)
        this.initialized = true
    }

    private async initCreateTable(options?: CreateTableOptions) {
        options = { ...this.createTableOptions, ...(options || {}) }
        let statement = `CREATE TABLE IF NOT EXISTS ${this.mysql.escapeId(this.name)}`;

        const columns: string[] = [];
        const indexes: string[] = [];

        this.columns.forEach((col) => {
            let sql = `${this.mysql.escapeId(col.name)} ${col.mysqlDataType}`;
            if (col.isUnsigned === true) sql += " UNSIGNED";
            if (col.isNullable === false) sql += " NOT NULL";
            if (col.autoIncrement === true) sql += " AUTO_INCREMENT";
            if (col.isPrimaryKey === true) indexes.push(`PRIMARY KEY (${this.mysql.escapeId(col.name)})`);
            if (col.hasIndex === true) indexes.push(`INDEX (${this.mysql.escapeId(col.name)})`);
            if (col.isUnique === true) indexes.push(`UNIQUE (${this.mysql.escapeId(col.name)})`);
            columns.push(sql);
        });

        statement += ` (${[...columns, ...indexes].join(", ")})`;
        statement += ` ENGINE=${options.engine}`;

        try {
            await this.mysql.performStatement(statement);
            return true;
        } catch (e) {
            throw e;
        }
    }

    // @ts-ignore - Added for future support
    private async initAlterTable(options?: AlterTableOptions) {
        options = { ...this.alterTableOptions, ...(options || {}) }


        // Add columns
        // todo: better error handling
        if (options.addColumns) {
            await Promise.all(this.columns.map(col => {
                let statement = `ALTER TABLE ${this.mysql.escapeId(this.name)} ADD COLUMN IF NOT EXISTS`;
                statement += ` ${this.mysql.escapeId(col.name)} ${col.mysqlDataType}`;
                if (col.isUnsigned === true) statement += " UNSIGNED";
                if (col.isNullable === false) statement += " NOT NULL";
                if (col.autoIncrement === true) statement += " AUTO_INCREMENT";
                return this.mysql.performStatement(statement);
            }))
        }


        // Modify columns
        if (options.modifyColumns) {
            await Promise.all(this.columns.map(col => {
                let statement = `ALTER TABLE ${this.mysql.escapeId(this.name)} MODIFY COLUMN IF EXISTS`;
                statement += ` ${this.mysql.escapeId(col.name)} ${col.mysqlDataType}`;
                if (col.isUnsigned === true) statement += " UNSIGNED";
                if (col.isNullable === false) statement += " NOT NULL";
                if (col.autoIncrement === true) statement += " AUTO_INCREMENT";
                return this.mysql.performStatement(statement);
            }))
        }

    }

    public createSelector(key, value, operator): Selector {
        return this.mysql.createSelector(key, value, operator)
    }

    public createSelectorFrom(...whereObjects): CombinedSelector {
        return this.mysql.createSelectorFrom(...whereObjects)
    }

    public combineSelectors(...orSelectors): CombinedSelector {
        return this.mysql.combineSelectors(...orSelectors)
    }

    public async insert(recordData: any) {
        const data = { ...recordData };

        // set created stamp if not already set and column type exists
        // note: if a created stamp is passed, this will not modify the stamp unless the column config alwaysSetCreatedStamp is true
        const createdStampCol = this.columns.find(col => col.dataType === "createdStamp")
        if (createdStampCol && (!data[createdStampCol.name] || createdStampCol.alwaysSetCreatedStamp)) data[createdStampCol.name] = this.mysql.getStamp()

        // Process data
        for (const [key] of Object.entries(data)) {
            const col = this.columns.find(col => col.name === key);
            if (!col) {
                delete data[key];
                continue;
            }
            data[key] = col.mysqlProcessDataIn(data[key]);
        }

        try {
            let statement = `INSERT INTO ${this.mysql.escapeId(this.name)} SET ?`
            let sub = [{ ...data }]
            const [results, fields, insertRecord] = await this.mysql.performStatement(statement, sub)
            return { results, fields, insertRecord }
        } catch (e) {
            throw e;
        }
    }

    public async select(selector: Selector | CombinedSelector | null, options?: SelectOptions) {
        // todo: add support for ORDER BY

        const props = options?.props ?? ["*"]
        if (props == null || props.length === 0) throw new Error(`You must provide the properties to return or pass "*" to return all props.`)

        let statement = `SELECT ${props.map(p=>p!=="*"?this.mysql.escapeId(p):p).join(",")} FROM ${this.mysql.escapeId(this.name)}`
        if (selector != null) statement += ` WHERE ${selector.makeStatement()}`

        try {
            let [results, fields] = await this.mysql.performStatement(statement)

            const processDataOut = (key, value) => {
                const col = this.columns.find(col => col.name === key)
                if (!col) return value
                return col.mysqlProcessDataOut(value)
            }

            results = results.map(record => {
                if (props.length === 1 && props[0] !== "*") {
                    const key = props[0]
                    if (key == undefined) throw new Error(`Undefined`)
                    return processDataOut(props[0], record[key])
                }
                for (const [key] of Object.entries(record)) {
                    record[key] = processDataOut(key, record[key])
                }
                return record;
            });

            return { results, fields }
        } catch (e) {
            throw e;
        }
    }

    public async update(recordData: any, selector: Selector | CombinedSelector | null) {
        const data = { ...recordData };

        let statement = `UPDATE ${this.mysql.escapeId(this.name)} SET ?`;
        if (selector != null) {
            statement += ` WHERE ${selector.makeStatement()}`;
        }

        // set updated stamp if not already set and column type exists
        // note: if the old updated stamp is passed, this will not modify the stamp, unless the column prop alwaysSetUpdatedStamp is true
        const updatedStampCol = this.columns.find(col => col.dataType === "updatedStamp")
        if (updatedStampCol && (!data[updatedStampCol.name] || updatedStampCol.alwaysSetUpdatedStamp)) data[updatedStampCol.name] = this.mysql.getStamp()


        // Process data
        for (const [key] of Object.entries(data)) {
            const col = this.columns.find(col => col.name === key);
            if (!col) {
                delete data[key];
                continue;
            }
            data[key] = col.mysqlProcessDataIn(data[key]);

            // Remove immutable properties
            if (!col.isMutable) delete data[key];
        }

        try {
            const res = await this.mysql.performStatement(statement, [{ ...data }]);
            // console.log("MySQL.table update res: ", res);
            return res;
        } catch (e) {
            throw e;
        }
    }

    public async delete(selector: Selector | CombinedSelector | null) {
        let statement = `DELETE FROM ${this.mysql.escapeId(this.name)}`;

        if (selector != null) {
            statement += ` WHERE ${selector.makeStatement()}`;
        }

        try {
            const res = await this.mysql.performStatement(statement);
            console.log("MySQL.table delete res: ", res);
            return res;
        } catch (e) {
            throw e;
        }
    }
}
export default Table
