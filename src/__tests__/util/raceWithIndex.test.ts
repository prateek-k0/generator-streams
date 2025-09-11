import { awaitableTimeout } from '../../util/awaitableTimeout';
import { raceWithIndex } from '../../util/raceWithIndex';

describe('testing raceWithIndex', () => {
    it("should return the index of the first resolved promise", async () => {
        const promises = [
            awaitableTimeout(50),
            awaitableTimeout(10),
            awaitableTimeout(30),
        ].map((p) => p.then(() => ({ done: true, value: undefined })));
        const { index } = await raceWithIndex(promises);
        expect(index).toBe(1);
    });
});