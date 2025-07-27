import { Stream } from "./stream/index";

Stream.from([1, 2, 3, 'ttrue']).subscribe(console.log);