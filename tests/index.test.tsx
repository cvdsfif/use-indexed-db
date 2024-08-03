import { render, waitFor } from "@testing-library/react"
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

        initAllImplementations()

        // We can only import the tested module once the mock for idb is set up
        const hookImport = await import("../src/index")
        defaultDbName = hookImport.LOCAL_DB_NAME
        defaultStoreName = hookImport.LOCAL_STORE_NAME

        TestComponent = () => {
            const [counter, setCounter, counterLoaded, deleteCounter] =
                hookImport.useIndexedDbState(
                    COUNTER_KEY,
                    0,
                    defaultNames
                )
            return <>
                <div data-testid="counter">{counter}</div>
                <button
                    data-testid="increment"
                    onClick={() => setCounter(counter + 1)}
                    disabled={!counterLoaded}
                >Increment</button>
                <button
                    data-testid="resetButton"
                    onClick={
                        () => {
                            deleteCounter()
                        }
                    }
                    disabled={!counterLoaded}
                >Reset</button>
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
        waitFor(() => expect(increment).not.toBeDisabled())

        // AND the database with the default name is opened
        expect(openDBMock).toHaveBeenCalledWith(defaultDbName, 1, expect.anything())

        // AND the store with the default name is created
        expect(createObjectStoreMock).toHaveBeenCalledWith(defaultStoreName)
    })

    test("Should increment value when button is clicked", async () => {
        // GIVEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // WHEN the increment button is clicked
        const increment = await findByTestId("increment")
        increment.click()

        // THEN the counter is incremented
        const counter = await findByTestId("counter")
        waitFor(() => expect(counter.textContent).toBe("1"))
    })

    test("Should load value from indexed db", async () => {
        // GIVEN a value can be retrieved from the DB
        dbGetMock.mockReturnValue(2)

        // WHEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // THEN the counter is set to the loaded value
        const counter = await findByTestId("counter")
        waitFor(() => expect(counter.textContent).toBe("2"))
    })

    test("Should store the value after the increment", async () => {
        // GIVEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // WHEN the increment button is clicked
        const increment = await findByTestId("increment")
        increment.click()

        // THEN the counter is stored in the DB
        waitFor(() => expect(dbPutMock).toHaveBeenCalledWith(1, COUNTER_KEY))
    })

    test("Should reset the counter when the reset button is called", async () => {
        // GIVEN a component set up and rendered
        const { findByTestId } = render(<TestComponent />)
        upgradeHandler(dbStub)

        // WHEN the increment button is clicked
        const reset = await findByTestId("resetButton")
        reset.click()

        // THEN the counter is removed from the DB
        waitFor(() => expect(dbDeleteMock).toHaveBeenCalledWith(COUNTER_KEY))

        // AND the counter is reset to the initial value
        const counter = await findByTestId("counter")
        waitFor(() => expect(counter.textContent).toBe("0"))
    })

    test("Should set up the hook with different database and store name", async () => {
        // GIVEN a component set up with different database and store names
        defaultNames = {
            localDbName: "testDb",
            storeName: "testStore"
        }

        // WHEN the component is rendered
        render(<TestComponent />)
        upgradeHandler(dbStub)

        // // AND the database with a different name is opened
        expect(openDBMock).toHaveBeenCalledWith("testDb", 1, expect.anything())

        // AND the store with a different name is created
        expect(createObjectStoreMock).toHaveBeenCalledWith("testStore")
    })
})