import Domain from "./domain";
interface Plugin {
    (domain: Domain): any;
}
export default Plugin;
