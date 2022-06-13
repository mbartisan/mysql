import {ColumnConfig, ColumnDataType} from "./Column"
import {MySQL, MySQLConnectionConfig, MySQLOptions} from "./MySQL"
import {TableQuery} from "./TableQuery"

export type MySQLColumnDefinition = {
    name: string,
    dataType: ColumnDataType,
    config: ColumnConfig
}

export class MySQLQuery {

    public mysql: MySQL

    public static create(connectionConfig: MySQLConnectionConfig, mysqlOptions?: MySQLOptions) {
        return new MySQLQuery(connectionConfig, mysqlOptions)
    }

    constructor(connectionConfig: MySQLConnectionConfig, mysqlOptions?: MySQLOptions) {
        this.mysql = new MySQL(connectionConfig, mysqlOptions)
    }

    async createTable<ResourceDefinition>(tableName: string, columns: MySQLColumnDefinition[]) {
        const table = this.mysql.createTable(tableName, columns.map(col => this.mysql.createColumn(col.name, col.dataType, col.config || {})))
        return await TableQuery.create<ResourceDefinition>(table)
    }

}
