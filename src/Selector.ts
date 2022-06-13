import CombinedSelector from "./CombinedSelector";

export enum SelectorOperator {
    Equals = "eq",
    GreaterThan = "gt",
    LessThan = "lt",
    GreaterThanOrEqual = "gte",
    LessThanOrEqual = "lte",
    NotEqual = "neq",
    Like = "like",
    StartsWith = "sw",
    EndsWith = "ew",
    In = "in",
    Null = "null",
    NotNull = "nnull"
}

export { CombinedSelector }
export class Selector {

    private readonly mysql
    public readonly key: string
    public readonly value: any
    public readonly operator: SelectorOperator

    public static create(mysql, key, value, operator) {
        return new Selector(mysql, key, value, operator)
    }

    // ex.
    // from(mysql, 'foo, 'bar'); -> true if has either foo OR bar
    // from(mysql, ['foo','bar']); -> true if has both foo AND bar
    // from(mysql, 'foo', ['bar','baz']); -> true if has foo OR (bar AND baz)
    public static from(mysql, ...whereObjects) {
        if (whereObjects.length === 0) throw new Error("You must pass a value.");

        const orSelectors: Selector[][] = [];
        whereObjects.forEach(whereObj => {
            const andSelectors: Selector[] = [];
            for (const [key, value] of Object.entries(whereObj)) {

                // Handle array of values
                // must be above the object check, since arrays are objects
                if (Array.isArray(value)) {
                    andSelectors.push(Selector.create(mysql, key, value, SelectorOperator.In));
                    continue;
                }

                // if an object is passed as a key's value, the key of the sub object is the operator and the value is the value.
                if (typeof value === 'object' && value != null) {
                    if (Object.keys(value).length > 1) throw new Error("Sub where objects can only have one operator filter.");
                    const operator = Object.keys(value)[0];
                    if (!operator) throw new Error("The passed value object does not have an operator key.")
                    andSelectors.push(Selector.create(mysql, key, value[operator], operator));
                    continue;
                }

                // Default
                andSelectors.push(Selector.create(mysql, key, value, SelectorOperator.Equals));
            }
            orSelectors.push(andSelectors);
        });
        return Selector.combineSelectors(mysql, ...orSelectors);
    }

    public static combineSelectors(mysql, ...orSelectors) {
        return CombinedSelector.create(mysql, ...orSelectors)
    }

    constructor(mysql, key: string, value: any, operator = SelectorOperator.Equals) {
        this.mysql = mysql
        this.key = key
        this.value = value
        this.operator = operator
    }

    public makeStatement() {
        switch (this.operator) {
            case SelectorOperator.Equals: // equals
                return `${this.mysql.escapeId(this.key)} = ${this.mysql.escape(this.value)}`;

            case SelectorOperator.GreaterThan: // greater than
                return `${this.mysql.escapeId(this.key)} > ${this.mysql.escape(this.value)}`;

            case SelectorOperator.LessThan: // less than
                return `${this.mysql.escapeId(this.key)} < ${this.mysql.escape(this.value)}`;

            case SelectorOperator.GreaterThanOrEqual: // greater than or equal to
                return `${this.mysql.escapeId(this.key)} >= ${this.mysql.escape(this.value)}`;

            case SelectorOperator.LessThanOrEqual: // less than or equal to
                return `${this.mysql.escapeId(this.key)} <= ${this.mysql.escape(this.value)}`;

            case SelectorOperator.NotEqual: // not equal to
                return `${this.mysql.escapeId(this.key)} <> ${this.mysql.escape(this.value)}`;

            case SelectorOperator.Like: // pattern search
                return `${this.mysql.escapeId(this.key)} LIKE '${this.mysql.escape(this.value)}'`;

            case SelectorOperator.StartsWith: // starts with
                return `${this.mysql.escapeId(this.key)} LIKE '%${this.mysql.escape(this.value)}'`;

            case SelectorOperator.EndsWith: // ends with
                return `${this.mysql.escapeId(this.key)} LIKE '${this.mysql.escape(this.value)}%'`;

            case SelectorOperator.In: // array in
                return `${this.mysql.escapeId(this.key)} IN (${this.value.map(v=>this.mysql.escape(v)).join(',')})`;

            case SelectorOperator.Null: // null
                return `${this.mysql.escapeId(this.key)} IS NULL`;

            case SelectorOperator.NotNull: // not null
                return `${this.mysql.escapeId(this.key)} IS NOT NULL`;

            default:
                throw new Error("Invalid operator of " + this.operator + ".");
        }
    }
}
export default Selector
