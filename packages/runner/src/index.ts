//import { run as init_polyjuice } from "./init_polyjuice";
import { start as startServer } from "./server";

const start = async () => {
    // await init_polyjuice();
     await startServer();
}

start();