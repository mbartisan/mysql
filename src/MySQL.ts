import * as lib_mysql from "mysql2/promise";

import Table, {TableOptions} from "./Table";
import Column, {ColumnConfig} from "./Column";
import Selector, {CombinedSelector} from "./Selector";

export interface MySQLConnectionConfig {
    host?: string,
    user?: string,
    password?: string,
    database?: string,
    options?: MySQLConnectionConfigOptions
}

export interface MySQLConnectionConfigOptions {
    connectionLimit?: number,
    queueLimit?: number
}

export interface MySQLOptions {
    createTables?: boolean,
    alterTables?: boolean,
    verbose?: boolean
}

export class MySQL {

    private readonly connection: any
    public readonly createTables: boolean
    public readonly alterTables: boolean
    private readonly verbose: boolean

    public static create(connectionConfig: MySQLConnectionConfig, options?: MySQLOptions): MySQL {
        if (!connectionConfig.host) connectionConfig.host = "localhost"
        if (!connectionConfig.user) connectionConfig.user = "root"
        if (!connectionConfig.password) connectionConfig.password = ""
        if (!connectionConfig.database) connectionConfig.database = ""
        return new MySQL(connectionConfig, options)
    }

    constructor(connectionConfig: MySQLConnectionConfig, options?: MySQLOptions) {

        this.connection = lib_mysql.createPool({
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            host: connectionConfig.host,
            user: connectionConfig.user,
            password: connectionConfig.password,
            database: connectionConfig.database,
            ...(connectionConfig.options || {})
        })

        this.createTables = options?.createTables || false
        this.alterTables = options?.alterTables || false
        this.verbose = options?.verbose || false

    }

    public getConnection() {
        return this.connection
    }

    public escapeId(id: string): string {
        return this.connection.escapeId(id)
    }

    public escape(input: any): any {
        return this.connection.escape(input)
    }

    public getStamp(): number {
        return parseInt((Date.now() / 1000).toFixed(0))
    }

    public async performStatement(statement: string, substitutions?: any[]) {
        if (this.verbose) console.log(statement, substitutions)
        const conn = this.getConnection()
        try {
            return await conn.query(statement, substitutions)
        } catch (error) {
            console.error(statement, substitutions, error)
            throw error
        }
    }

    public createTable(name: string, columns?: Column[], config?: TableOptions): Table {
        return Table.create(this, name, columns, {
            createTable: this.createTables,
            alterTable: this.alterTables,
            ...config
        })
    }

    public createColumn(name, dataType, config?: ColumnConfig): Column {
        return Column.create(this, name, dataType, config)
    }

    public createSelector(key, value, operator): Selector {
        return Selector.create(key, value, operator)
    }

    public createSelectorFrom(...whereObjects): CombinedSelector {
        return Selector.from(...whereObjects)
    }

    public combineSelectors(...orSelectors): CombinedSelector {
        return Selector.combineSelectors(...orSelectors)
    }

}
export default MySQL
