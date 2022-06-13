import {Table, SelectOptions} from "./Table"
import {SelectorOperator} from "./Selector"

type Selector<RD> = Partial<RD> | {
    [Property in keyof Partial<RD>]: Partial<Record<SelectorOperator, RD[Property]>> | RD[Property][]
}
type WhereSelector<RD> = Selector<RD> | Selector<RD>[]

export class TableQuery<ResourceDefinition> {

    public table: Table

    public static async create<ResourceDefinition>(mysqlTable: Table, init: boolean = true) {
        if (init) {
            console.warn(`MySQLQuery: Init ${mysqlTable.name} table. Create: ${mysqlTable.createTable} Alter: ${mysqlTable.alterTable}`)
            await mysqlTable.init()
        }
        return new TableQuery<ResourceDefinition>(mysqlTable)
    }

    // public static create<ResourceDefinition>(mysqlTable: Table) {
    //     return new TableQuery<ResourceDefinition>(mysqlTable)
    // }

    constructor(mysqlTable: Table) {
        this.table = mysqlTable;
    }

    async create(data: Partial<ResourceDefinition>, options = {}): Promise<boolean> {
        options = { ...options }
        await this.table.insert({ ...data })
        return true // todo: return boolean if row successfully inserted else return error
    }

    async update(where: WhereSelector<ResourceDefinition>, data: Partial<ResourceDefinition>, options = {}): Promise<number> {
        options = { ...options }
        if (!Array.isArray(where)) where = [where]
        await this.table.update(data, this.table.createSelectorFrom(...where))
        return 1 // todo: return number of modified rows else return error
    }

    async delete(where: WhereSelector<ResourceDefinition>, options = {}): Promise<number> {
        options = { ...options }
        if (!Array.isArray(where)) where = [where]
        await this.table.delete(this.table.createSelectorFrom(...where))
        return 1 // todo: return number of deleted rows else return error
    }

    async find(where: WhereSelector<ResourceDefinition> | true, options?: SelectOptions): Promise<ResourceDefinition[]> {
        options = { ...options }
        if (where !== true && !Array.isArray(where)) where = [where]
        // const getSelector = (where) => {
        //     if (where === true) return null
        //     return this.table.createSelectorFrom(...where)
        // }
        const selector = where === true ? null : this.table.createSelectorFrom(...where as WhereSelector<ResourceDefinition>[])
        const { results } = await this.table.select(selector, options)
        if (results.length === 0) return []
        return results
    }

    async findValue<K extends keyof ResourceDefinition>(where: WhereSelector<ResourceDefinition>, valueKey: string, options= {}): Promise<ResourceDefinition[K][]> {
        if (!Array.isArray(where)) where = [where]
        const selector = this.table.createSelectorFrom(...where)
        const { results } = await this.table.select(selector, { ...options, props: [valueKey] })
        return results
    }

    async findFirst(where: WhereSelector<ResourceDefinition>, options = {}): Promise<ResourceDefinition|null> {
        // todo: use mysql limit 1 statement
        // todo: add option for the order by
        const results = await this.find(where, options);
        return results[0]
    }

}
