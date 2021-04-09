import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Home from './components/home/Home';


export default function MyRouter() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path='/'>
          <Home></Home>
        </Route>
     </Switch> 
    </BrowserRouter>
  );
}
