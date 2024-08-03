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

export const useIndexedDbState = <T>(
    key: string,
    defaultValue: T,
    {
        localDbName,
        storeName
    } = {
            localDbName: LOCAL_DB_NAME,
            storeName: LOCAL_STORE_NAME
        }
): [T, Dispatch<SetStateAction<T>>, boolean, () => Promise<void>] => {
    const [value, setValue] = useState(defaultValue)
    const [loaded, setLoaded] = useState(false)

    const connectLocalDb = async () => await connectDb(localDbName, storeName)

    const getStoredUserData = async () => await loadStoredData(key, { localDbName, storeName })

    const setStoredUserData = async (data: T) => {
        const db = await connectLocalDb()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        await Promise.allSettled([
            store.put(data, key),
            tx.done
        ])
    }

    const deleteStoredUserData = async () => {
        const db = await connectLocalDb()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        await Promise.allSettled([
            store.delete(key),
            tx.done
        ])
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
            if (!loaded) setLoaded(true)
        })
    }, [])

    return [value, setValue, loaded, deleteStoredUserData]
}