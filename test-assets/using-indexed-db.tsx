import { useIndexedDb } from "../src/index";

export const COUNTER_KEY = "counterKey"

export const TestComponent = () => {
    const [counter, setCounter, counterLoaded, deleteCounter] =
        useIndexedDb(
            COUNTER_KEY,
            0
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