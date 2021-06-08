import { start as startApiServer } from "./server";
import { start as startUI } from "./ui";
import { start as startPrepareServer } from "./prepare";

const start = async () => {
    startPrepareServer();
    await startApiServer();
    startUI();
}

start();
