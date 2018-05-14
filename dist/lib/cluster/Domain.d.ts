export default class Domain {
    private manager;
    private $domain;
    constructor({manager}: {
        manager: any;
    });
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
}
