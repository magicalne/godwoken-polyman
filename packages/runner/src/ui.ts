import Config from '../configs/server.json';
import express from 'express';
import path from 'path';

export const app = express();
app.use(express.static(path.join(__dirname, '../ui')));

app.get('/*', function (req: any, res: { sendFile: (arg0: any) => void; }) {
  res.sendFile(path.join(__dirname, '../ui', 'index.html'));
});

export function start () {
   app.listen(Config.ui_port, () => {
       console.log(`check http://localhost:${Config.ui_port} to deploy contract!`);
   });
}