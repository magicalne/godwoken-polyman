import { start as startApiServer } from "./server";
import { start as startUI } from "./ui";

const start = async () => {
    await startApiServer();
    startUI();
}

start();
