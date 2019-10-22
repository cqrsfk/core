import update from "immutability-helper";
import { get, set, debounce, cloneDeep } from "lodash";

export function updater(obj, cb: (obj: any) => void) {
    
    obj = cloneDeep(obj);
    cb = debounce(cb);
    cb(obj);

    return function (changer) {
        const { isDelete, isFun, isSet, isMap, isArray, key, parentPath, argv, root, path, newValue } = changer;

        const parentKey = (path as string).split(".")[0];

        if (["_", "$"].includes(parentKey[0])) return;

        if (isArray) {
            switch (key) {
                case "push":
                    obj = update(obj, set({}, parentPath, { $push: argv }))
                    break;
                case "unshift":
                    obj = update(obj, set({}, parentPath, { $unshift: argv }))
                    break;
                case "shift":
                    obj = update(obj, set({}, parentPath, { $splice: [[0, 1]] }))
                    break;
                case "pop":
                    const lastIndex = get(obj as any, parentPath).length - 1;
                    if (lastIndex >= 0) {
                        obj = update(obj, set({}, parentPath, { $splice: [[lastIndex, 1]] }))
                    }
                    break;
                case "reverse":
                    const arr = get(obj as any, parentPath);
                    arr.reverse();
                    obj = update(obj, set({}, parentPath, { $set: [...arr] }))
                    break;
                case "splice":
                    obj = update(obj, set({}, parentPath, { $splice: [argv] }))
                    break;
            }
        } else if (isSet) {
            switch (key) {
                case "add":
                    obj = update(obj, set({}, parentPath, { $add: argv }))
                    break;

                case "clear":
                    obj = update(obj, set({}, parentPath, { $set: new Set }))

                    break;

                case "delete":
                    obj = update(obj, set({}, parentPath, { $remove: argv }))

                    break;

            }
        } else if (isMap) {
            switch (key) {
                case "set":
                    obj = update(obj, set({}, parentPath, { $add: [argv] }))
                    break;

                case "clear":
                    obj = update(obj, set({}, parentPath, { $set: new Map }))

                    break;

                case "delete":
                    obj = update(obj, set({}, parentPath, { $remove: argv }))

                    break;

            }
        } else if (isDelete) {
            const opt = parentPath ? set({}, parentPath, { $unset: [key] }) : { $unset: [key] };
            obj = update(obj, opt);
        } else {
            obj = update(obj, set({}, path, { $set: newValue }))
        }

        cb(obj);

    }
}