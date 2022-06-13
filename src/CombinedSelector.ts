export class CombinedSelector {

    protected readonly mysql
    public readonly selectors

    public static create(mysql, ...orSelectors) {
        return new CombinedSelector(mysql, orSelectors)
    }

    constructor(mysql, orSelectors) {
        if (orSelectors.length === 0) throw new Error("You must pass a value.");
        this.mysql = mysql
        this.selectors = orSelectors
    }

    public makeStatement() {
        // ex.
        // combineSelectors('foo, 'bar'); -> true if has either foo OR bar
        // combineSelectors(['foo','bar']); -> true if has both foo AND bar
        // combineSelectors('foo', ['bar','baz']); -> true if has foo OR (bar AND baz)
        let statement = "";

        this.selectors.forEach((sel, idx) => {
            if (idx !== 0) statement += " OR ";
            if (!Array.isArray(sel)) sel = [sel];
            if (sel.length > 1) statement += "(";
            sel.forEach((sel, idx) => {
                if (idx !== 0) statement += " AND ";
                statement += sel.makeStatement();
            });
            if (sel.length > 1) statement += ")";
        })

        return statement
    }

}
export default CombinedSelector
