import { openDB } from "idb"
import { Dispatch, SetStateAction, useEffect, useState } from "react"

/**
 * Default database name for local storage
 */
export const LOCAL_DB_NAME = "defaultLocalDb"
/**
 * Default store for key-value pairs
 */
export const LOCAL_STORE_NAME = "defaultStore"

const connectDb = async (localDbName: string, storeName: string) => await openDB(localDbName, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
        }
    }
})

/**
 * Asynchronously load data from local database
 * @param key Storage key string
 * @param param1 Optional properties object allowing to specify the local database name as `localDbName` and the store as `storeName`
 * @returns Data from store or undefined if not found
 */
export const loadStoredData = async <T>(
    key: string,
    { localDbName, storeName } = { localDbName: LOCAL_DB_NAME, storeName: LOCAL_STORE_NAME }): Promise<T | undefined> => {
    const db = await connectDb(localDbName, storeName)
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const data = await store.get(key)
    return data as T | undefined
}

/**
 * Asynchronously store the structured data in local database
 * @param key Storage key string
 * @param data Data object to store
 * @param param2 Optional properties object allowing to specify the local database name as `localDbName` and the store as `storeName`
 */
export const saveStoredUserData = async <T>(
    key: string,
    data: T,
    { localDbName, storeName } = { localDbName: LOCAL_DB_NAME, storeName: LOCAL_STORE_NAME }
) => {
    const db = await connectDb(localDbName, storeName)
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    await Promise.allSettled([
        store.put(data, key),
        tx.done
    ])
}

/**
 * Optional properties for the `useIndexedDbState` hook
 */
export type IndexedDbStateProps = {
    /**
     * Optional local database name
     */
    localDbName?: string,
    /**
     * Optional store name
     */
    storeName?: string,
    /**
     * Optional callback function called when the data is loaded from local DB
     */
    loadedCallback?: () => void,
    /**
     * Optional callback function called when the data is stored to local DB
     */
    storedCallback?: () => void
}

/**
 * This hook is similar to `useState`, except that it stores the data in local database between sessions
 * @param key Name of the key to store data
 * @param defaultValue Initial value, always set before the eventual saved value is loaded from the database 
 * @param props Optional properties, as defined in {@link}
 * @returns Tuple containing the value, the setter function, a boolean indicating if the data is loaded, and a function to delete the stored data
 */
export const useIndexedDbState = <T>(
    key: string,
    defaultValue: T,
    props?: IndexedDbStateProps
): [T, Dispatch<SetStateAction<T>>, boolean, () => Promise<void>] => {
    const localDbNameValue = props?.localDbName ?? LOCAL_DB_NAME
    const storeNameValue = props?.storeName ?? LOCAL_STORE_NAME

    const [value, setValue] = useState(defaultValue)
    const [storedValue, setStoredValue] = useState<T | undefined>(undefined)
    const [loaded, setLoaded] = useState(false)

    const connectLocalDb = async () => await connectDb(localDbNameValue, storeNameValue)

    const getStoredUserData = async () => {
        const lastStoredValue = await loadStoredData(key, {
            localDbName: localDbNameValue,
            storeName: storeNameValue
        })
        setStoredValue(lastStoredValue)
        return lastStoredValue
    }

    const setStoredUserData = async (data: T) => {
        if (storedValue === data) return
        await saveStoredUserData(key, data, { localDbName: localDbNameValue, storeName: storeNameValue })
        props?.storedCallback?.()
        setStoredValue(data)
    }

    const deleteStoredUserData = async () => {
        const db = await connectLocalDb()
        const tx = db.transaction(storeNameValue, "readwrite")
        const store = tx.objectStore(storeNameValue)
        await Promise.allSettled([
            store.delete(key),
            tx.done
        ])
        setStoredValue(undefined)
        setValue(defaultValue)
    }

    useEffect(() => {
        if (loaded) setStoredUserData(value)
    }, [value])

    useEffect(() => {
        getStoredUserData().then(data => {
            if (data) {
                setValue(data)
            }
            if (!loaded) {
                setLoaded(true)
                props?.loadedCallback?.()
            }
        })
    }, [])

    return [value, setValue, loaded, deleteStoredUserData]
}