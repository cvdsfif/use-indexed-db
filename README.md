# React hook persisting the state between sessions

![Coverage](./badges/coverage.svg) [![npm version](https://badge.fury.io/js/use-indexed-db-state.svg)](https://badge.fury.io/js/![typizator](https://badge.fury.io/js/use-indexed-db-state.svg)) [![Node version](https://img.shields.io/node/v/use-indexed-db-state.svg?style=flat)](https://nodejs.org/)

## Purpose

This hook is similar to `useState` except that it persists the data locally using the IndexedDb built-in browsers' database.

## Installing

```bash
npm i use-indexed-db-state
```

## Documentation

In the simplest case, the only difference with `useState` is the additional parameter specifying the key under which the value will be stored. This name must be unique per database and per store. You can change the default database and store name through an additional optional parameter, this will be discussed later.

```ts
const [data, setData] = useIndexedDbState("data", 0)
```

You can use the returned values exactly like if it were a `useState` hook, but when you reload the page (or get back after a while) the last value will be restored instead of setting `data` to initial value passed as the second argument of the hook.

But this will not be immediate. IndexedDb is asynchronous so there will be a short moment when `data` will be set to the initial value, then the previous value will be read and the `data` value will be changed.

To handle this, there is the third returned value in the tuple that informs us if the initial data loading is done or not:

```ts
const [data, setData, dataLoaded] = useIndexedDbState("data", 0)
// ...
return <button
            disabled={!dataLoaded}
            onClick={()=>setData(oldValue => oldValue + 1)}
        >The counter value is {data}</button>
```

In this example, the button will stay disabled until the initial value is loaded from the local database.

There is a fourth value returned in the same tuple, it's a `deleteData` function that removes the actual value from the store and replaces it immediately by the default value.

If you want to split the namespaces (for example, use the same `data` name for a different domain), you can pass the name of the database and the store as properties in the third parameter of the hook.

```ts
const [data, setData] = useIndexedDbState("data", 0, { localDbName: "differentDatabase", storeName: "differentStore" })
```

In this case, your `"data"` key will not interfer with one above.

If you want a more fine-graned management of the hook's lifecycle, you can capture the events of loading or storing the hook's value. Note that the _store_ event only happens when the value passed to `setData` is different from the previously stored one. It works exactly like for the `useState` hook, i.e. if you change the contents of the array taken from the hook and pass it back to the set function, it will be considered as the same and no update will be made.

```ts
const [data, setData] = useIndexedDbState("data", 0, 
    { 
        loadedCallback: () => notifyLoad(),
        storedCallback: () => invalidateContext()
    }
)
```

It is possible to access the stored data outside of the hook, the library exports two asynchronous functions, `loadStoredData` and `saveStoredData` that allow you to manipulate these values in an external context, for example in loader functions.

## Testing

You don't have to care about the IndexedDb storage details when you write your tests. The best way is to mock the hook's behaviour and to simulate its lifecycle in different test cases.

The safe way to do it is before importing your tested component into the test suite:

```ts
let storedCallbackFromHook: () => void

const indexedDbStubClosure = () => {
    const valuesDictionary: { [k: string]: any } = {}
    const valuesLoaded: { [k: string]: boolean } = {}
    return {
        hookFunction: (key: string, initialValue: any, { storedCallback }: { storedCallback: () => void }) => {
            storedCallbackFromHook = storedCallback
            return [
                valuesDictionary[key] ? valuesDictionary[key] : valuesDictionary[key] = initialValue,
                (value: any) => valuesDictionary[key] = value,
                valuesLoaded[key] === true ? true : false,
                () => valuesDictionary[key] = undefined
            ]
        },
        simulateIsLoaded: (key: string) => valuesLoaded[key] = true,
        simulateStoredValue: (key: string, value: any) => valuesDictionary[key] = value,
        reset: () => {
            Object.keys(valuesDictionary).forEach(k => delete valuesDictionary[k])
            Object.keys(valuesLoaded).forEach(k => delete valuesLoaded[k])
        }
    }
}
const indexedDbStub = indexedDbStubClosure()

jest.mock("use-indexed-db-state", () => ({
    useIndexedDbState: indexedDbStub.hookFunction,
    loadStoredData: loadStoredDataMock
}))

await import("../src/under-test")
```

This will give you instruments of control and a good simulation of the hook's behaviour without going into storage details that are not necessary for your logic. Depending on your business logic, you can to further with this stub implementation