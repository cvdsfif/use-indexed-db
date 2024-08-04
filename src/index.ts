import { openDB } from "idb"
import { Dispatch, SetStateAction, useEffect, useState } from "react"

export const LOCAL_DB_NAME = "defaultLocalDb"
export const LOCAL_STORE_NAME = "defaultStore"

const connectDb = async (localDbName: string, storeName: string) => await openDB(localDbName, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
        }
    }
})

export const loadStoredData = async (
    key: string,
    { localDbName, storeName } = { localDbName: LOCAL_DB_NAME, storeName: LOCAL_STORE_NAME }) => {
    const db = await connectDb(localDbName, storeName)
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const data = await store.get(key)
    return data
}

export type IndexedDbStateProps = {
    localDbName?: string,
    storeName?: string,
    loadedCallback?: () => void,
    storedCallback?: () => void
}

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
        console.log("Storing", data, storedValue)
        if (storedValue === data) return
        const db = await connectLocalDb()
        const tx = db.transaction(storeNameValue, "readwrite")
        const store = tx.objectStore(storeNameValue)
        await Promise.allSettled([
            store.put(data, key),
            tx.done
        ])
        console.log("Stored", data)
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