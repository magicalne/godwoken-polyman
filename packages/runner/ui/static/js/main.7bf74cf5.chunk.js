(this["webpackJsonp@godwoken-examples/client"]=this["webpackJsonp@godwoken-examples/client"]||[]).push([[0],{21:function(t,e,n){"use strict";(function(t){var r=n(34),a=n.n(r),c=n(25);e.a={convertTimestamp:function(t){return"string"===typeof t?new Date(parseInt(t)).toLocaleTimeString():new Date(t).toLocaleTimeString()},hex2dec:function(t){return BigInt(t).toString(10)},dec2hex:function(t){return BigInt(t).toString(16)},shannon2CKB:function(t){return a.a.divide(a.a.BigInt(t),a.a.BigInt(1e8)).toString(10)},CKB2shannon:function(t){return BigInt(t).toString(10)+"00000000"},isObjectInArray:function(t,e){for(var n=0;n<e.length;n++)if(JSON.stringify(e[n])===JSON.stringify(t))return!0;return!1},arrayBufferToBuffer:function(e){for(var n=t.alloc(e.byteLength),r=new Uint8Array(e),a=0;a<n.length;++a)n[a]=r[a];return n},get_env_mode:function(){return"development"===c.mode?"development":"production"},asyncSleep:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return new Promise((function(e){return setTimeout(e,t)}))}}}).call(this,n(87).Buffer)},25:function(t){t.exports=JSON.parse('{"development_server_url":"http://localhost:6101","web3_server_url":"http://localhost:8024","production_server_url":"https://your.domain","mode":"development"}')},318:function(t,e,n){"use strict";n.r(e);var r=n(0),a=n.n(r),c=n(22),s=n.n(c),o=(n(66),n(60)),i=n(6),u=n(23),l=n(2),p=n.n(l),d=n(4),f=n(9),b=n(12),h=(n(68),n(10)),x=n(16),g=n(7),j=n.n(g),v=n(25),O=n(21);j.a.defaults.withCredentials=!0;var m=function(){function t(){Object(h.a)(this,t),this.base_url=void 0,this.base_url="development"===O.a.get_env_mode()?v.development_server_url:v.production_server_url}return Object(x.a)(t,[{key:"getRollupTypeHash",value:function(){var t=Object(d.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_rollup_type_hash"),{params:{}});case 2:return e=t.sent,t.abrupt("return",e.data);case 4:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"getEthAccountLockConfig",value:function(){var t=Object(d.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_eth_acccount_lock"),{params:{}});case 2:return e=t.sent,t.abrupt("return",e.data);case 4:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"getBalance",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_layer2_balance"),{params:{eth_address:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"getSudtBalance",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_layer2_sudt_balance"),{params:{eth_address:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"issueToken",value:function(){var t=Object(d.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/issue_token"),{params:{}});case 2:return e=t.sent,t.abrupt("return",e.data);case 4:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"getSudtToken",value:function(){var t=Object(d.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_sudt_token"),{});case 2:return e=t.sent,t.abrupt("return",e.data);case 4:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"deposit",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/deposit"),{params:{eth_address:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"deposit_sudt",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/deposit_sudt"),{params:{eth_address:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"transfer",value:function(){var t=Object(d.a)(p.a.mark((function t(e,n,r,a){var c;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post("".concat(this.base_url,"/transfer"),{data:{to_id:e,amount:n,fee:r,eth_address:a}});case 2:return c=t.sent,t.abrupt("return",c.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e,n,r,a){return t.apply(this,arguments)}}()},{key:"deployContract",value:function(){var t=Object(d.a)(p.a.mark((function t(e,n){var r;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post("".concat(this.base_url,"/deploy_contract"),{data:{contract_code:e,eth_address:n}});case 2:return r=t.sent,t.abrupt("return",r.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e,n){return t.apply(this,arguments)}}()},{key:"deployErc20ProxyContract",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post("".concat(this.base_url,"/deploy_erc20_proxy_contract"),{data:{eth_address:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"deploySudtContract",value:function(){var t=Object(d.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post("".concat(this.base_url,"/deploy_sudt_contract"),{data:{}});case 2:return e=t.sent,t.abrupt("return",e.data);case 4:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"sendL2Transaction",value:function(){var t=Object(d.a)(p.a.mark((function t(e,n,r,a){var c;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post("".concat(this.base_url,"/send_l2_tx"),{data:{raw_l2tx:e,signature:n,type:r,l2_script_args:a}});case 2:return c=t.sent,t.abrupt("return",c.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e,n,r,a){return t.apply(this,arguments)}}()},{key:"getTransactionReceipt",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_tx_receipt"),{params:{tx_hash:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"getContractAddrByAccountId",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.get("".concat(this.base_url,"/get_contract_addr_by_account_id"),{params:{account_id:e}});case 2:return n=t.sent,t.abrupt("return",n.data);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()}]),t}();j.a.defaults.withCredentials=!1;var y=function(){function t(){Object(h.a)(this,t),this.url=void 0,this.url=v.web3_server_url}return Object(x.a)(t,[{key:"getBalance",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post(this.url,{jsonrpc:"2.0",id:+new Date,method:"eth_getBalance",params:[e]},{headers:{"Content-Type":"application/json"}});case 2:return n=t.sent,t.abrupt("return",n.data.result);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"getTransactionReceipt",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,j.a.post(this.url,{jsonrpc:"2.0",id:+new Date,method:"eth_getTransactionReceipt",params:[e]},{headers:{"Content-Type":"application/json"}});case 2:return n=t.sent,t.abrupt("return",n.data.result);case 4:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()},{key:"waitForTransactionReceipt",value:function(){var t=Object(d.a)(p.a.mark((function t(e){var n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=3,O.a.asyncSleep(1e3);case 3:return t.next=5,this.getTransactionReceipt(e);case 5:if(n=t.sent,console.log("tx_receipt: ".concat(n)),!n){t.next=9;break}return t.abrupt("break",11);case 9:t.next=0;break;case 11:return t.abrupt("return");case 12:case"end":return t.stop()}}),t,this)})));return function(e){return t.apply(this,arguments)}}()}]),t}(),k={page:{maxWidth:"700px",margin:"atuo",textAlign:"center"},content:{width:"100%",marginTop:"20px",textAlign:"left"},main_color:{color:"#3CC68A"},background_color:{color:"#282c34"},wide_card:{padding:"10px",textAlign:"left"},wide_card_title:{color:"#3CC68A",textAlign:"center"},blockquote:{background:"#f9f9f9",borderLeft:"10px solid #3CC68A",margin:"1.5em 10px",padding:"1em 2em",color:"black"},clear_path:{clear:"both"},li:{listStyleType:"none",marginLeft:"0"},ul:{listStyleType:"none",paddingLeft:"0"},status_bar:{width:"100%",padding:"5px",margin:"10px 0px",clear:"both",justifyContent:"center"},status_bar_title:{float:"left",fontSize:"16px",fontWeight:"bolder"},status_bar_btn:{float:"right",textAlign:"center",marginRight:"20px"},modal:{maxWidth:"700px",maxHeight:"80%",overflowY:"scroll",padding:"20px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"},paper:{backgroundColor:"gray",border:"2px solid #000",boxShadow:"10px",padding:"10px",width:"100%",outline:"none"},hidden_btn:{width:"100%",border:"0",backgroundColor:"rgb(0,0,0, 0)",height:"0",cursor:"auto"},single_line_code:{background:"white",color:"gray",padding:"2px",borderRadius:"5px"},explain_text:{fontSize:"14px",color:"gray",margin:"20px"},input_wrap:{padding:"2px 5px",marginBottom:"10px",display:"block",background:"white"},input:{width:"100%",outline:"none",fontSize:"14px",border:"0",overflowX:"scroll",verticalAlign:"text-bottom"},describe_img_wrapper:{maxWidth:"100px",margin:"40px auto"},describe_img:{width:"100%",height:"100%",background:"#282c34"},describe_img_footnote:{textAlign:"center",fontSize:"11px"}},w=n(30),_=(n(91),n(3)),S=Object(b.a)(Object(b.a)({},k),{loader:{border:"4px solid rgba(60, 198, 138, 0.2)",borderLeft:"4px solid",animation:"load 1s infinite linear",borderRadius:"50%",width:"25px",height:"25px",margin:"0 auto"},btn:{padding:"0.5rem 1rem",fontSize:"12px",color:"white",borderRadius:"6px",border:"1px solid "+k.main_color.color,outline:"none",backgroundColor:"rgb(255,255,255, 0)",cursor:"pointer"},btndiv:{display:"flex",justifyContent:"center",alignItems:"center",width:"100%",height:"100%"},btn_hover:{padding:"0.5rem 1rem",fontSize:"12px",color:"white",borderRadius:"6px",border:"1px solid "+k.main_color.color,outline:"none",backgroundColor:k.main_color.color,cursor:"pointer"}}),C=function(){return Object(_.jsx)("div",{style:S.loader})};function T(t){var e=Object(r.useState)(0),n=Object(f.a)(e,2),a=n[0],c=(n[1],Object(r.useState)(0)),s=Object(f.a)(c,2),o=s[0],i=(s[1],Object(r.useRef)(null)),u=void 0===t.isLoading,l=Object(r.useState)(!1),h=Object(f.a)(l,2),x=h[0],g=h[1],j=Object(r.useState)(!u&&t.isLoading),v=Object(f.a)(j,2),O=v[0],m=v[1],y=Object(r.useState)(!1),k=Object(f.a)(y,2),T=k[0],A=k[1],B=function(){var e=Object(d.a)(p.a.mark((function e(){return p.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return u&&m(!0),e.next=3,t.onClick();case 3:u&&m(!1);case 4:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();Object(r.useEffect)((function(){if(void 0!==t.isLoading&&m(t.isLoading),O&&g(!0),!O&&x){var e=setTimeout((function(){g(!1)}),400);return function(){clearTimeout(e)}}}),[t.isLoading,O,x]);var J=Object(w.b)({opacity:x?1:0}),N=Object(w.b)({opacity:x?0:1}),R=function(){A(!T)},L=a&&o?{width:"".concat(a,"px"),height:"".concat(o,"px")}:{},I=T?S.btn_hover:S.btn,E=Object(b.a)(Object(b.a)({},I),L),z="undefined"===t.custom_style?{}:t.custom_style,D=Object(b.a)(Object(b.a)({},E),z);return Object(_.jsx)("button",{style:D,onClick:B,onMouseEnter:R,onMouseLeave:R,ref:i,children:x?Object(_.jsx)(w.a.div,{style:J,children:Object(_.jsx)(C,{})}):Object(_.jsx)(w.a.div,{style:N,children:t.text})})}var A=n(24),B=(n(93),n(94),Object(b.a)(Object(b.a)({},k),{panel:{},toast:{padding:"10px",fontSize:"14px"}}));function J(){return Object(_.jsx)("div",{children:Object(_.jsx)(A.a,{style:B.panel,toastStyle:B.toast})})}var N=function(t,e){switch(e){case"error":A.b.error(t);break;case"success":A.b.success(t);break;case"warning":A.b.warn(t);break;case"info":A.b.info(t);break;case"dark":A.b.dark(t);break;default:A.b.error(t)}},R=n(336),L=n(337),I=n(335),E=Object(b.a)(Object(b.a)({},k),{header:{minHeight:"300px",margin:"10px"},address:{color:"#a0eec0"},balance:{color:"whitesmoke"},button:{fontSize:"25px",width:"100%",maxWidth:"700px",margin:"10px",padding:"0.7rem 1.2rem"},contract_container:{width:"100%",maxWidth:"700px",margin:"30px auto",textAlign:"left",fontSize:"15px",border:"1px solid gray",color:"gray"},contract_li:{listStyleType:"none"},descrip_sudt:{width:"600px",fontSize:"13px",margin:"30px auto",textAlign:"left"},placeholder_for_experimental:{width:"700px",margin:"0 auto",marginTop:"50px"}});var z=function(){var t=Object(r.useRef)(null),e=Object(r.useState)(),n=Object(f.a)(e,2),a=n[0],c=n[1],s=Object(r.useState)("0"),o=Object(f.a)(s,2),i=o[0],l=o[1],b=Object(r.useState)("0"),h=Object(f.a)(b,2),x=h[0],g=h[1],j=Object(r.useState)(!1),v=Object(f.a)(j,2),k=v[0],w=v[1],S=Object(r.useState)([]),C=Object(f.a)(S,2),A=C[0],B=C[1],z=Object(r.useState)(),D=Object(f.a)(z,2),P=(D[0],D[1]),F=Object(r.useState)(),K=Object(f.a)(F,2),H=(K[0],K[1]),q=Object(r.useState)(),W=Object(f.a)(q,2),M=W[0],Y=W[1];Object(r.useEffect)((function(){window.ethereum&&(window.ethereum.request({method:"eth_requestAccounts"}),c(window.ethereum.selectedAddress)),Q(),V()}),[]),Object(r.useEffect)((function(){a&&(U(),G())}),[a]),window.ethereum.on("accountsChanged",(function(t){c(t[0])}));var U=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n,r;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(a){t.next=2;break}return t.abrupt("return");case 2:return e=new y,t.prev=3,t.next=6,e.getBalance(a);case 6:return n=t.sent,r=BigInt(n).toString(),console.log(r),t.next=11,l(O.a.shannon2CKB(r));case 11:console.log(O.a.shannon2CKB(r)),t.next=17;break;case 14:t.prev=14,t.t0=t.catch(3),N(JSON.stringify(t.t0));case 17:case"end":return t.stop()}}),t,null,[[3,14]])})));return function(){return t.apply(this,arguments)}}(),X=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(a){t.next=2;break}return t.abrupt("return");case 2:return e=new m,t.prev=3,t.next=6,e.getSudtBalance(a);case 6:if("ok"===(n=t.sent).status){t.next=9;break}return t.abrupt("return",N("failed to get sudt balance from account. issue sudt token then ".concat(JSON.stringify(n.error))));case 9:return t.next=11,g(O.a.shannon2CKB(n.data));case 11:console.log(O.a.shannon2CKB(n.data)),t.next=17;break;case 14:t.prev=14,t.t0=t.catch(3),N(JSON.stringify(t.t0));case 17:case"end":return t.stop()}}),t,null,[[3,14]])})));return function(){return t.apply(this,arguments)}}(),G=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=new m,t.prev=1,t.next=4,e.getSudtToken();case 4:if(n=t.sent,console.log(n),"ok"===n.status){t.next=8;break}return t.abrupt("return",console.log("failed to get sudt token. ".concat(JSON.stringify(n.error))));case 8:return t.next=10,Y(n.data.sudt_token);case 10:return t.next=12,X();case 12:t.next=17;break;case 14:t.prev=14,t.t0=t.catch(1),N(JSON.stringify(t.t0));case 17:case"end":return t.stop()}}),t,null,[[1,14]])})));return function(){return t.apply(this,arguments)}}(),Q=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=new m,t.prev=1,t.next=4,e.getRollupTypeHash();case 4:if("ok"===(n=t.sent).status){t.next=7;break}return t.abrupt("return",N("failed to get rollup type hash. ".concat(JSON.stringify(n.error))));case 7:P(n.data),t.next=13;break;case 10:t.prev=10,t.t0=t.catch(1),N(JSON.stringify(t.t0));case 13:case"end":return t.stop()}}),t,null,[[1,10]])})));return function(){return t.apply(this,arguments)}}(),V=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=new m,t.prev=1,t.next=4,e.getEthAccountLockConfig();case 4:if("ok"===(n=t.sent).status){t.next=7;break}return t.abrupt("return",N("failed to get eth_account_lock config. ".concat(JSON.stringify(n.error))));case 7:H(n.data),t.next=13;break;case 10:t.prev=10,t.t0=t.catch(1),N(JSON.stringify(t.t0));case 13:case"end":return t.stop()}}),t,null,[[1,10]])})));return function(){return t.apply(this,arguments)}}(),Z=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(a){t.next=2;break}return t.abrupt("return",N("metamask account not found."));case 2:return e=new m,t.prev=3,t.next=6,e.deposit(a);case 6:if(n=t.sent,console.log(n),"ok"!==n.status){t.next=14;break}return N("your account id: ".concat(n.data.account_id),"success"),t.next=12,U();case 12:t.next=15;break;case 14:N(JSON.stringify(n.error));case 15:t.next=20;break;case 17:t.prev=17,t.t0=t.catch(3),N(JSON.stringify(t.t0));case 20:case"end":return t.stop()}}),t,null,[[3,17]])})));return function(){return t.apply(this,arguments)}}(),$=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(a){t.next=2;break}return t.abrupt("return",N("metamask account not found."));case 2:return e=new m,t.prev=3,t.next=6,e.deposit_sudt(a);case 6:if(n=t.sent,console.log(n),"ok"!==n.status){t.next=15;break}return N("your account id: ".concat(n.data.account_id),"success"),console.log("res.data.l2_sudt_script_hash: ".concat(n.data.l2_sudt_script_hash)),t.next=13,X();case 13:t.next=16;break;case 15:N(JSON.stringify(n.error));case 16:t.next=21;break;case 18:t.prev=18,t.t0=t.catch(3),N(JSON.stringify(t.t0));case 21:case"end":return t.stop()}}),t,null,[[3,18]])})));return function(){return t.apply(this,arguments)}}(),tt=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=new m,t.prev=1,t.next=4,e.issueToken();case 4:n=t.sent,console.log(n),"ok"===n.status?N("issue a sudt token: ".concat(n.data.sudt_token),"success"):N(JSON.stringify(n.error,null,2)),t.next=12;break;case 9:t.prev=9,t.t0=t.catch(1),N(JSON.stringify(t.t0));case 12:case"end":return t.stop()}}),t,null,[[1,9]])})));return function(){return t.apply(this,arguments)}}(),et=function(){var e=Object(d.a)(p.a.mark((function e(){return p.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(t){e.next=2;break}return e.abrupt("return",N("input ref not found."));case 2:t.current.click();case 3:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}(),nt=function(){var t=Object(d.a)(p.a.mark((function t(e){var n,r,c,s,o;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(e){t.next=2;break}return t.abrupt("return",N("upload contract binary file first!"));case 2:if(a){t.next=4;break}return t.abrupt("return",N("window.ethereum.selectedAddress not found."));case 4:return n=new y,t.prev=5,r={nonce:"0x0",gasPrice:"0x9184e72a000",gas:"0x2710",to:"0x",from:window.ethereum.selectedAddress,value:"0x00",data:e,chainId:"0x3"},t.next=9,window.ethereum.request({method:"eth_sendTransaction",params:[r]});case 9:return c=t.sent,console.log("txHash: ".concat(c)),t.next=13,n.waitForTransactionReceipt(c);case 13:return t.next=15,n.getTransactionReceipt(c);case 15:s=t.sent,console.log("txReceipt: ".concat(JSON.stringify(s,null,2))),o=s.contractAddress,console.log("contract address: ".concat(o)),N("your contract address: ".concat(o),"success"),B((function(t){return[].concat(Object(u.a)(t),[o])})),t.next=27;break;case 23:return t.prev=23,t.t0=t.catch(5),console.log(t.t0),t.abrupt("return",N("could not finished signing process. \n\n ".concat(JSON.stringify(t.t0))));case 27:case"end":return t.stop()}}),t,null,[[5,23]])})));return function(e){return t.apply(this,arguments)}}(),rt=function(){var t=Object(d.a)(p.a.mark((function t(e){var n,r,a;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return n=e.target.files[0],w(!0),t.next=4,ct(n);case 4:if("ok"===(r=t.sent).status){t.next=8;break}return w(!1),t.abrupt("return",N("can not read contract code from file."));case 8:return a=r.data,console.log("reading contract code hex:"),console.log(a),t.next=14,nt(a);case 14:w(!1);case 15:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),at=function(){var t=Object(d.a)(p.a.mark((function t(){var e,n,r,c,s,o,i,l;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(a){t.next=2;break}return t.abrupt("return",N("window.ethereum.selectedAddress not found."));case 2:return e=new m,n=new y,t.prev=4,t.next=7,e.deployErc20ProxyContract(a);case 7:return"ok"!==(r=t.sent).status&&N(JSON.stringify(r.error,null,2)),c=r.data,console.log(JSON.stringify(c,null,2)),t.prev=11,s={nonce:"0x0",gasPrice:"0x9184e72a000",gas:"0x2710",to:"0x",from:window.ethereum.selectedAddress,value:"0x00",data:c,chainId:"0x3"},t.next=15,window.ethereum.request({method:"eth_sendTransaction",params:[s]});case 15:return o=t.sent,console.log("txHash: ".concat(o)),t.next=19,n.waitForTransactionReceipt(o);case 19:return t.next=21,n.getTransactionReceipt(o);case 21:i=t.sent,console.log("txReceipt: ".concat(JSON.stringify(i,null,2))),l=i.contractAddress,console.log("contract address: ".concat(l)),N("your contract address: ".concat(l),"success"),B((function(t){return[].concat(Object(u.a)(t),[l])})),t.next=33;break;case 29:return t.prev=29,t.t0=t.catch(11),console.log(t.t0),t.abrupt("return",N("could not finished signing process. \n\n ".concat(JSON.stringify(t.t0))));case 33:t.next=38;break;case 35:t.prev=35,t.t1=t.catch(4),N(JSON.stringify(t.t1));case 38:case"end":return t.stop()}}),t,null,[[4,35],[11,29]])})));return function(){return t.apply(this,arguments)}}(),ct=function(t){return new Promise((function(e,n){var r=new FileReader;r.onload=function(t){var n="0x".concat(t.target.result);e({status:"ok",data:n})},r.onerror=function(t){e({status:"failed",error:t})},r.onabort=function(){e({status:"failed",error:"user abort."})},r.readAsBinaryString(t)}))};return Object(_.jsx)("div",{children:Object(_.jsx)("div",{className:"App",children:Object(_.jsxs)("header",{className:"App-header",children:[Object(_.jsx)(J,{}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsxs)(R.a,{item:!0,xs:12,style:E.header,children:[Object(_.jsxs)("h3",{children:["Your EthAddress: ",a," "]}),Object(_.jsxs)("div",{children:["Balance: ",Object(_.jsxs)("span",{style:E.balance,children:[i," CKB "]})]})]})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsx)(T,{text:"Deposit CKB",onClick:Z,custom_style:E.button})})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsxs)(R.a,{item:!0,xs:12,children:[Object(_.jsx)(T,{text:"Deploy ETH Contract",isLoading:k,onClick:et,custom_style:E.button}),Object(_.jsx)("input",{type:"file",ref:t,onChange:rt,hidden:!0})]})}),Object(_.jsx)("hr",{}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsxs)(R.a,{item:!0,xs:12,style:E.contract_container,children:["Contract Address:",Object(_.jsx)(L.a,{language:"javascript",style:I.a,children:A.length>0?A.join("\n"):"nothing."})]})}),Object(_.jsx)("hr",{}),Object(_.jsx)("div",{style:E.placeholder_for_experimental,children:Object(_.jsx)("hr",{style:{width:"100%"}})}),Object(_.jsx)("h4",{children:" Sudt Section (experimental) "}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsxs)("div",{children:["Balance: ",Object(_.jsxs)("span",{style:E.balance,children:[x," Sudt "]})]})})}),Object(_.jsx)("hr",{}),Object(_.jsx)(R.a,{container:!0,spacing:5,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsxs)("div",{style:E.descrip_sudt,children:[Object(_.jsx)("p",{children:"you should issue sudt token first if sudt token is empty."}),Object(_.jsx)("p",{children:"depositting sudt by defaut will give you 400 sudt each time. and the capacity of ckb required is also 400 ckb, so the balance of your layer2 ckb will also increase. "})]})})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsxs)("h5",{children:["Sudt Token:  ",M?null===M||void 0===M?void 0:M.slice(0,6):"","..",M?null===M||void 0===M?void 0:M.slice(60):""]})})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsx)(T,{text:"Issue Sudt Token",onClick:tt,custom_style:E.button})})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsx)(T,{text:"Deposit Sudt",onClick:$,custom_style:E.button})})}),Object(_.jsx)(R.a,{container:!0,spacing:3,children:Object(_.jsx)(R.a,{item:!0,xs:12,children:Object(_.jsx)(T,{text:"Deploy Erc20-Proxy Contract",onClick:at,custom_style:E.button})})})]})})})};function D(){return Object(_.jsx)(o.a,{children:Object(_.jsx)(i.c,{children:Object(_.jsx)(i.a,{path:"/",children:Object(_.jsx)(z,{})})})})}var P=function(t){t&&t instanceof Function&&n.e(3).then(n.bind(null,338)).then((function(e){var n=e.getCLS,r=e.getFID,a=e.getFCP,c=e.getLCP,s=e.getTTFB;n(t),r(t),a(t),c(t),s(t)}))};s.a.render(Object(_.jsx)(a.a.StrictMode,{children:Object(_.jsx)(D,{})}),document.getElementById("root")),P()},66:function(t,e,n){},68:function(t,e,n){},91:function(t,e,n){},94:function(t,e,n){}},[[318,1,2]]]);
//# sourceMappingURL=main.7bf74cf5.chunk.js.map