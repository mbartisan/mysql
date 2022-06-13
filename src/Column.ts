export interface ColumnConfig {
    mutable?: boolean
    nullable?: boolean
    unsigned?: boolean
    autoIncrement?: boolean
    collation?: string
    defaultValue?: string | number | boolean | null | undefined
    primaryKey?: boolean
    index?: boolean
    unique?: boolean
    alwaysSetCreatedStamp?: boolean
    alwaysSetUpdatedStamp?: boolean
}
type CustomDataTypes = "boolean"|"bool"|"json"|"string"|"number"|"stamp"|"createdStamp"|"updatedStamp"
type IntDataType = "int"|`int(${number})`|`tinyint`|`tinyint(${number})`|`smallint`|`mediumint`|`bigint`|`bigint(${number})`
type VarcharDataType = `varchar(${number})`
type TextDataType = "text"|"mediumtext"|"longtext"

// todo: Add DataIn handling for date and timestamp. User's shall pass a JS date as the value and we'll format for MySQL
type DateDataType = "datetime"
// type DateDataType = "date"|"datetime"|"timestamp"

export type ColumnDataType = CustomDataTypes|IntDataType|VarcharDataType|TextDataType|DateDataType
export class Column {

    protected readonly mysql
    public readonly name: string
    public readonly dataType: ColumnDataType
    public readonly isMutable: boolean
    public readonly isNullable: boolean
    public readonly isUnsigned: boolean
    public readonly isPrimaryKey: boolean
    public readonly hasIndex: boolean
    public readonly isUnique: boolean
    public readonly autoIncrement: boolean
    public readonly collation: string
    public readonly defaultValue: string | number | boolean | null | undefined
    public readonly mysqlDataType: string
    public readonly alwaysSetCreatedStamp: boolean
    public readonly alwaysSetUpdatedStamp: boolean

    public static create(mysql, name, dataType, config) {
        return new Column(mysql, name, dataType, config)
    }

    constructor(mysql, name: string, dataType: ColumnDataType, config: ColumnConfig = {}) {
        this.mysql = mysql
        this.name = name
        this.dataType = dataType
        this.isMutable = (config.primaryKey) ? false : (config.mutable ?? true)
        this.isNullable = config.nullable ?? false
        this.isUnsigned = config.unsigned ?? false
        this.isPrimaryKey = config.primaryKey ?? false
        this.hasIndex = config.index ?? false
        this.isUnique = config.unique ?? false
        this.autoIncrement = config.autoIncrement || false
        this.collation = config.collation ?? "utf8mb4_general_ci"
        this.defaultValue = config.defaultValue
        this.mysqlDataType = this.getMySQLDataType()
        this.alwaysSetCreatedStamp = config.alwaysSetCreatedStamp ?? false
        this.alwaysSetUpdatedStamp = config.alwaysSetUpdatedStamp ?? false
    }

    protected getMySQLDataType() {
        switch (this.dataType) {
            case 'bool':
            case 'boolean':
                return 'tinyint(1)'

            case 'json':
                return 'text'

            case 'string':
                if (this.hasIndex || this.isPrimaryKey) {
                    return "varchar(119)"
                }
                return "varchar(255)"

            case 'number':
                return 'int(11)'

            case 'stamp':
            case 'createdStamp':
            case 'updatedStamp':
                return 'int(11)'

            default:
                return this.dataType
        }
    }

    public mysqlProcessDataIn(dataValue) {
        if (dataValue == null && this.defaultValue !== undefined) {
            dataValue = this.defaultValue
        }
        switch (this.dataType) {
            case 'bool':
            case 'boolean':
                return (!!dataValue) ? 1 : 0

            case 'json':
                return JSON.stringify(dataValue)

            case 'datetime':
                if (typeof dataValue === 'number') dataValue = new Date(dataValue)
                if (dataValue instanceof Date) return `${dataValue.toISOString().slice(0, 19).replace('T', ' ')}.${dataValue.getUTCMilliseconds()}`
                return dataValue

            default:
                return dataValue
        }
    }

    public mysqlProcessDataOut(dataValue) {
        if (dataValue == null && this.defaultValue !== undefined) {
            dataValue = this.defaultValue
        }
        switch (this.dataType) {
            case 'bool':
            case 'boolean':
                return !!dataValue

            case 'json':
                return JSON.parse(dataValue)

            case 'datetime':
                const [yr,mo,dy,hr,mn,secDec] = dataValue.split(/[- :]/)
                const [sec, msDec] = secDec.split(".")
                let ms;
                if (msDec) ms = 1000 * parseFloat(`0.${msDec}`)
                return new Date(Date.UTC(yr, parseInt(mo)-1, dy, hr, mn, sec, ms))

            default:
                return dataValue
        }
    }
}
export default Column
