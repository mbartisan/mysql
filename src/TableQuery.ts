import {Table, SelectOptions} from "./Table"
import {SelectorOperator} from "./Selector"

type ObjectSelector<RD> = Partial<RD> | {
    [Property in keyof Partial<RD>]: Partial<Record<SelectorOperator, RD[Property]>> | RD[Property][]
}
type WhereSelector<RD> = ObjectSelector<RD> | ObjectSelector<RD>[]

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

    async create(data: Partial<ResourceDefinition>, options?: SelectOptions): Promise<boolean> {
        await this.table.insert({ ...data })
        return true // todo: return boolean if row successfully inserted else return error
    }

    async update(where: WhereSelector<ResourceDefinition>, data: Partial<ResourceDefinition>, options?: SelectOptions): Promise<number> {
        if (!Array.isArray(where)) where = [where]
        await this.table.update(data, this.table.createSelectorFrom(...where))
        return 1 // todo: return number of modified rows else return error
    }

    async delete(where: WhereSelector<ResourceDefinition>, options?: SelectOptions): Promise<number> {
        if (!Array.isArray(where)) where = [where]
        await this.table.delete(this.table.createSelectorFrom(...where))
        return 1 // todo: return number of deleted rows else return error
    }

    async find(where: WhereSelector<ResourceDefinition> | true, options?: SelectOptions): Promise<ResourceDefinition[]> {
        if (where !== true && !Array.isArray(where)) where = [where]
        // const getSelector = (where) => {
        //     if (where === true) return null
        //     return this.table.createSelectorFrom(...where)
        // }
        const selector = where === true ? null : this.table.createSelectorFrom(...where as WhereSelector<ResourceDefinition>[])
        const results = await this.table.select<ResourceDefinition>(selector, options)
        if (results.length === 0) return []
        return results
    }

    async findValue<K extends keyof ResourceDefinition>(where: WhereSelector<ResourceDefinition>, valueKey: string, options?: SelectOptions): Promise<ResourceDefinition[K][]> {
        if (!Array.isArray(where)) where = [where]
        const selector = this.table.createSelectorFrom(...where)
        return await this.table.select<ResourceDefinition[K]>(selector, { ...(options ?? {}), props: [valueKey] })
    }

    async findFirst(where: WhereSelector<ResourceDefinition>, options?: SelectOptions): Promise<ResourceDefinition|null> {
        // todo: use mysql limit 1 statement
        // todo: add option for the order by
        const results = await this.find(where, options);
        return results[0] ?? null
    }

}
