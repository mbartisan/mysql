import SqlString from "sqlstring"
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

    public readonly key: string
    public readonly value: any
    public readonly operator: SelectorOperator

    public static create(key, value, operator) {
        return new Selector(key, value, operator)
    }

    // ex.
    // from(mysql, 'foo, 'bar'); -> true if has either foo OR bar
    // from(mysql, ['foo','bar']); -> true if has both foo AND bar
    // from(mysql, 'foo', ['bar','baz']); -> true if has foo OR (bar AND baz)
    public static from(...whereObjects) {
        if (whereObjects.length === 0) throw new Error("You must pass a value.");

        const orSelectors: Selector[][] = [];
        whereObjects.forEach(whereObj => {
            const andSelectors: Selector[] = [];
            for (const [key, value] of Object.entries(whereObj)) {

                // Handle array of values
                // must be above the object check, since arrays are objects
                if (Array.isArray(value)) {
                    andSelectors.push(Selector.create(key, value, SelectorOperator.In));
                    continue;
                }

                // if an object is passed as a key's value, the key of the sub object is the operator and the value is the value.
                if (typeof value === 'object' && value != null) {
                    if (Object.keys(value).length > 1) throw new Error("Sub where objects can only have one operator filter.");
                    const operator = Object.keys(value)[0];
                    if (!operator) throw new Error("The passed value object does not have an operator key.")
                    andSelectors.push(Selector.create(key, value[operator], operator));
                    continue;
                }

                // Default
                andSelectors.push(Selector.create(key, value, SelectorOperator.Equals));
            }
            orSelectors.push(andSelectors);
        });
        return Selector.combineSelectors(...orSelectors);
    }

    public static combineSelectors(...orSelectors) {
        return CombinedSelector.create(...orSelectors)
    }

    constructor(key: string, value: any, operator = SelectorOperator.Equals) {
        this.key = key
        this.value = value
        this.operator = operator
    }

    public makeStatement() {
        switch (this.operator) {
            case SelectorOperator.Equals: // equals
                return `${SqlString.escapeId(this.key)} = ${SqlString.escape(this.value)}`;

            case SelectorOperator.GreaterThan: // greater than
                return `${SqlString.escapeId(this.key)} > ${SqlString.escape(this.value)}`;

            case SelectorOperator.LessThan: // less than
                return `${SqlString.escapeId(this.key)} < ${SqlString.escape(this.value)}`;

            case SelectorOperator.GreaterThanOrEqual: // greater than or equal to
                return `${SqlString.escapeId(this.key)} >= ${SqlString.escape(this.value)}`;

            case SelectorOperator.LessThanOrEqual: // less than or equal to
                return `${SqlString.escapeId(this.key)} <= ${SqlString.escape(this.value)}`;

            case SelectorOperator.NotEqual: // not equal to
                return `${SqlString.escapeId(this.key)} <> ${SqlString.escape(this.value)}`;

            case SelectorOperator.Like: // pattern search
                return `${SqlString.escapeId(this.key)} LIKE '${SqlString.escape(this.value)}'`;

            case SelectorOperator.StartsWith: // starts with
                return `${SqlString.escapeId(this.key)} LIKE '%${SqlString.escape(this.value)}'`;

            case SelectorOperator.EndsWith: // ends with
                return `${SqlString.escapeId(this.key)} LIKE '${SqlString.escape(this.value)}%'`;

            case SelectorOperator.In: // array in
                return `${SqlString.escapeId(this.key)} IN (${this.value.map(v=>SqlString.escape(v)).join(',')})`;

            case SelectorOperator.Null: // null
                return `${SqlString.escapeId(this.key)} IS NULL`;

            case SelectorOperator.NotNull: // not null
                return `${SqlString.escapeId(this.key)} IS NOT NULL`;

            default:
                throw new Error("Invalid operator of " + this.operator + ".");
        }
    }
}
export default Selector
