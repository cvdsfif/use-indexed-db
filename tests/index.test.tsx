import { /*act,*/ act, fireEvent, getByTestId, render, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

describe("Testing the useIndexedDbState hook", () => {
    let TestComponent: React.FC
    let upgradeHandler: any

    const COUNTER_KEY = "testCounter"

    const openDBMock = jest.fn()
    const createObjectStoreMock = jest.fn()
    const dbGetMock = jest.fn()
    const dbPutMock = jest.fn()
    const dbDeleteMock = jest.fn()
    const objectStoreContainsMock = jest.fn()
    const transactionMock = jest.fn()
    let defaultNames: { localDbName: string, storeName: string } | undefined = undefined
    let defaultDbName: string
    let defaultStoreName: string

    let loadStoredDataImported = async (_: string, _1?: { localDbName: string, storeName: string }) => Promise<any>

    const initAllImplementations = () => {
        openDBMock.mockImplementation(async (_, _1, options) => {
            upgradeHandler = options.upgrade
            return dbStub
        })
        transactionMock.mockImplementation(() => ({
            objectStore: jest.fn().mockImplementation(() => ({
                get: dbGetMock,
                put: dbPutMock,
                delete: dbDeleteMock,
            })),
            done: Promise.resolve("")
        }))
    }

    const dbStub = {
        objectStoreNames: { contains: objectStoreContainsMock },
        createObjectStore: createObjectStoreMock,
        transaction: transactionMock
    }

    beforeAll(async () => {
        jest.mock(
            "idb",
            () => ({
                openDB: openDBMock
            })
        )

        // We can only import the tested module once the mock for idb is set up
        const hookImport = await import("../src/index")
        defaultDbName = hookImport.LOCAL_DB_NAME
        defaultStoreName = hookImport.LOCAL_STORE_NAME
        loadStoredDataImported = hookImport.loadStoredData

        const ButtonMock = ({
            onClick, dataTestid, disabled, children
        }: {
            onClick: () => void,
            dataTestid: string,
            disabled: boolean,
            children: any
        }) => (<span
            onClick={onClick}
            data-testid={dataTestid}
            aria-disabled={disabled}
        >{children}</span>
        )

        TestComponent = () => {
            const [counter, setCounter, counterLoaded, deleteCounter] =
                hookImport.useIndexedDbState(
                    COUNTER_KEY,
                    0,
                    defaultNames
                )
            return <>
                <div data-testid="counter">{counter}</div>
                <ButtonMock
                    dataTestid="increment"
                    onClick={
                        () => {
                            setCounter(counter => counter + 1)
                        }
                    }
                    disabled={!counterLoaded}
                >Increment</ButtonMock>
                <ButtonMock
                    dataTestid="resetButton"
                    onClick={
                        () => {
                            deleteCounter()
                        }
                    }
                    disabled={!counterLoaded}
                >Reset</ButtonMock>
            </>
        }
    })

    beforeEach(async () => {
        initAllImplementations()
    })

    afterEach(async () => {
        jest.resetAllMocks()
    })

    test("Should set initial value from hook", async () => {
        // GIVEN a component set up

        // WHEN the component is rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // THEN the initial value is set
        const counter = await findByTestId("counter")
        expect(counter.textContent).toBe("0")

        // AND the increment button is enabled after loading
        const increment = await findByTestId("increment")
        await waitFor(() => expect(increment).not.toBeDisabled())

        // AND the database with the default name is opened
        expect(openDBMock).toHaveBeenCalledWith(defaultDbName, 1, expect.anything())

        // AND the store with the default name is created
        expect(createObjectStoreMock).toHaveBeenCalledWith(defaultStoreName)
    })

    test("Should increment value when button is clicked", async () => {
        // GIVEN a component set up and rendered
        const { container } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // WHEN the increment button is clicked
        const increment = await getByTestId(container, "increment")
        fireEvent.click(increment)

        // THEN the counter is incremented
        const counter = await getByTestId(container, "counter")
        await waitFor(() => expect(counter.textContent).toBe("1"))
    })

    test("Should load value from indexed db", async () => {
        // GIVEN a value can be retrieved from the DB
        dbGetMock.mockReturnValue(2)

        // WHEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // THEN the counter is set to the loaded value
        const counter = await findByTestId("counter")
        await waitFor(() => expect(counter.textContent).toBe("2"))
    })

    test("Should store the value after increment", async () => {
        // GIVEN a component set up and rendered
        const { container, findByTestId } = await act(() => render(<TestComponent />))
        upgradeHandler(dbStub)

        // AND we wait for 100ms to let the local store load
        await new Promise((resolve) => setTimeout(resolve, 100))

        // WHEN the increment button is clicked
        const increment = await getByTestId(container, "increment")
        fireEvent.click(increment)

        // THEN the counter is stored in the DB
        await waitFor(() => expect(dbPutMock).toHaveBeenCalledWith(1, COUNTER_KEY))

        const counter = await findByTestId("counter")
        await waitFor(() => expect(counter.textContent).toBe("1"))

        await waitFor(() => expect(increment).not.toBeDisabled())
    })

    test("Should reset the counter when the reset button is called", async () => {
        // GIVEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // WHEN the increment button is clicked
        const reset = await findByTestId("resetButton")
        reset.click()

        // THEN the counter is removed from the DB
        await waitFor(() => expect(dbDeleteMock).toHaveBeenCalledWith(COUNTER_KEY))

        // AND the counter is reset to the initial value
        const counter = await findByTestId("counter")
        await waitFor(() => expect(counter.textContent).toBe("0"))
    })

    test("Should set up the hook with different database and store name", async () => {
        // GIVEN a component set up with different database and store names
        defaultNames = {
            localDbName: "testDb",
            storeName: "testStore"
        }

        // WHEN the component is rendered
        await act(() => render(<TestComponent />))
        upgradeHandler(dbStub)

        // // AND the database with a different name is opened
        expect(openDBMock).toHaveBeenCalledWith("testDb", 1, expect.anything())

        // AND the store with a different name is created
        expect(createObjectStoreMock).toHaveBeenCalledWith("testStore")
    })

    test("Should load value from indexed db with an external loader", async () => {
        // GIVEN a value can be retrieved from the DB
        dbGetMock.mockReturnValue(2)

        // WHEN loading the value directly from the loader
        const loaded = await loadStoredDataImported(COUNTER_KEY)
        upgradeHandler(dbStub)

        // THEN the counter is set to the loaded value
        expect(loaded).toBe(2)
    })

    test("Should load value from indexed db with an external loader using a different database and store", async () => {
        // GIVEN a value can be retrieved from the DB
        dbGetMock.mockReturnValue(2)

        // WHEN loading the value directly from the loader
        const loaded = await loadStoredDataImported(COUNTER_KEY, { localDbName: "testDb", storeName: "testStore" })
        upgradeHandler(dbStub)

        // THEN the counter is set to the loaded value
        expect(loaded).toBe(2)

        // // AND the database with a different name is opened
        expect(openDBMock).toHaveBeenCalledWith("testDb", 1, expect.anything())

        // AND the store with a different name is created
        expect(createObjectStoreMock).toHaveBeenCalledWith("testStore")
    })
})