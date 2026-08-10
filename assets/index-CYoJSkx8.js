(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const F=["red","green","yellow","white"],Q=["general","advisor","elephant","chariot","cannon","horse","pawn"],P=28,wn=4,$n=Object.fromEntries(Q.map((n,e)=>[n,e])),bn=Object.fromEntries(F.map((n,e)=>[n,e]));function U(n,e){return $n[n]*4+bn[e]}function y(n){return U(n.rank,n.color)}function j(n){return Q[Math.floor(n/4)]}function C(n){return F[n%4]}const J={general:{vi:"Tướng",en:"General",glyph:"將"},advisor:{vi:"Sĩ",en:"Advisor",glyph:"士"},elephant:{vi:"Tượng",en:"Elephant",glyph:"象"},chariot:{vi:"Xe",en:"Chariot",glyph:"車"},cannon:{vi:"Pháo",en:"Cannon",glyph:"砲"},horse:{vi:"Mã",en:"Horse",glyph:"馬"},pawn:{vi:"Tốt",en:"Soldier",glyph:"卒"}},R={red:{vi:"đỏ",en:"red"},green:{vi:"xanh",en:"green"},yellow:{vi:"vàng",en:"yellow"},white:{vi:"trắng",en:"white"}};function m(n){return`${J[j(n)].vi} ${R[C(n)].vi}`}function vn(){const n=[];let e=0;for(const t of Q)for(const a of F)for(let s=0;s<wn;s++)n.push({id:e++,rank:t,color:a});return n}function L(n){const e=new Array(P).fill(0);for(const t of n)e[y(t)]++;return e}function kn(n){let e=n>>>0;return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function Tn(n,e){const t=n.slice();for(let a=t.length-1;a>0;a--){const s=Math.floor(e()*(a+1));[t[a],t[s]]=[t[s],t[a]]}return t}const G=U("pawn","red");function sn(n,e){const t=[],a=Math.floor(e/4),s=e%4,r=n[e];if(a===0&&t.push({kind:"loneGeneral",uses:[e]}),r>=2&&t.push({kind:"pair",uses:[e,e]}),r>=3&&t.push({kind:"triple",uses:[e,e,e]}),r>=4&&t.push({kind:"quad",uses:[e,e,e,e]}),a<=2){const o=s,l=4+s,i=8+s;n[o]>0&&n[l]>0&&n[i]>0&&t.push({kind:"tst",uses:[o,l,i]})}else if(a<=5){const o=12+s,l=16+s,i=20+s;n[o]>0&&n[l]>0&&n[i]>0&&t.push({kind:"xpm",uses:[o,l,i]})}else{const o=[];for(let l=0;l<4;l++)l!==s&&n[G+l]>0&&o.push(G+l);for(let l=0;l<o.length;l++)for(let i=l+1;i<o.length;i++)t.push({kind:"pawns3",uses:[e,o[l],o[i]]});o.length===3&&t.push({kind:"pawns4",uses:[e,...o]})}return t}function an(n){for(let e=0;e<P;e++)if(n[e]>0)return e;return-1}function rn(n){const e=n.slice(),t=new Map,a=()=>{const s=an(e);if(s<0)return!0;const r=e.join(","),o=t.get(r);if(o!==void 0)return o;let l=!1;for(const i of sn(e,s)){for(const h of i.uses)e[h]--;a()&&(l=!0);for(const h of i.uses)e[h]++;if(l)break}return t.set(r,l),l};return a()}function Mn(n){const e=n.slice(),t=new Map,a=()=>{const s=an(e);if(s<0)return 0;const r=e.join(","),o=t.get(r);if(o!==void 0)return o;e[s]--;let l=a();e[s]++;for(const i of sn(e,s)){for(const d of i.uses)e[d]--;const h=i.uses.length+a();for(const d of i.uses)e[d]++;h>l&&(l=h)}return t.set(r,l),l};return a()}function z(n){let e=0;for(const t of n)e+=t;return e-Mn(n)}function Ln(n,e){const t=n.slice();return t[e]++,rn(t)}function xn(n,e,t){const a=[],s=e,r=Math.floor(s/4),o=s%4;if(n[s]>=2&&a.push({kind:"triple",fromHand:[s,s]}),n[s]>=3&&a.push({kind:"quad",fromHand:[s,s,s]}),r<=2){const l=[o,4+o,8+o].filter(i=>i!==s);n[l[0]]>0&&n[l[1]]>0&&a.push({kind:"tst",fromHand:l})}else if(r<=5){const l=[12+o,16+o,20+o].filter(i=>i!==s);n[l[0]]>0&&n[l[1]]>0&&a.push({kind:"xpm",fromHand:l})}else if(j(s)==="pawn"){const l=[];for(let i=0;i<4;i++)i!==o&&n[G+i]>0&&l.push(G+i);for(let i=0;i<l.length;i++)for(let h=i+1;h<l.length;h++)a.push({kind:"pawns3",fromHand:[l[i],l[h]]});l.length===3&&a.push({kind:"pawns4",fromHand:l})}return a.filter(l=>t-l.fromHand.length>=1)}const nn=3,x={pair:{concealed:0,exposed:0},triple:{concealed:6,exposed:1},quad:{concealed:8,exposed:6},tst:{concealed:1,exposed:1},xpm:{concealed:1,exposed:1},pawns3:{concealed:1,exposed:1},pawns4:{concealed:4,exposed:4},loneGeneral:{concealed:1,exposed:1}};function Hn(n){const e=n.slice(),t=new Map,a=r=>{const o=[],l=Math.floor(r/4),i=r%4,h=e[r];if(l===0&&o.push({kind:"loneGeneral",uses:[r]}),h>=2&&o.push({kind:"pair",uses:[r,r]}),h>=3&&o.push({kind:"triple",uses:[r,r,r]}),h>=4&&o.push({kind:"quad",uses:[r,r,r,r]}),l<=2){const d=i,f=4+i,b=8+i;e[d]>0&&e[f]>0&&e[b]>0&&o.push({kind:"tst",uses:[d,f,b]})}else if(l<=5){const d=12+i,f=16+i,b=20+i;e[d]>0&&e[f]>0&&e[b]>0&&o.push({kind:"xpm",uses:[d,f,b]})}else{const d=[];for(let f=0;f<4;f++)f!==i&&e[24+f]>0&&d.push(24+f);for(let f=0;f<d.length;f++)for(let b=f+1;b<d.length;b++)o.push({kind:"pawns3",uses:[r,d[f],d[b]]});d.length===3&&o.push({kind:"pawns4",uses:[r,...d]})}return o},s=()=>{let r=-1;for(let i=0;i<P;i++)if(e[i]>0){r=i;break}if(r<0)return{lenh:0,melds:[]};const o=e.join(",");if(t.has(o))return t.get(o);let l=null;for(const i of a(r)){for(const d of i.uses)e[d]--;const h=s();for(const d of i.uses)e[d]++;if(h){const d=h.lenh+x[i.kind].concealed;(!l||d>l.lenh)&&(l={lenh:d,melds:[i,...h.melds]})}}return t.set(o,l),l};return s()}function on(n,e,t,a){const s=[];for(const i of e)s.push({kind:i.kind,uses:i.uses,concealed:!1,lenh:x[i.kind].exposed});const r=Hn(t);if(!r)throw new Error("scoreWin called on a hand that does not decompose");let o=-1;if(a!==null){let i=1/0;r.melds.forEach((h,d)=>{if(h.uses.includes(a)){const f=x[h.kind].concealed-x[h.kind].exposed;f<i&&(i=f,o=d)}})}r.melds.forEach((i,h)=>{const d=h!==o;s.push({kind:i.kind,uses:i.uses,concealed:d,lenh:d?x[i.kind].concealed:x[i.kind].exposed})});const l=s.reduce((i,h)=>i+h.lenh,0)+nn;return{winner:n,lenh:l,breakdown:s,winBonus:nn}}const N=4,en=20;function ln(n){return(n+1)%N}function En(n){const e=n.dealer??0,t=kn(n.seed),a=Tn(vn(),t),s=[];let r=0;for(let i=0;i<N;i++){const h=i===e?en+1:en;s.push({hand:Z(a.slice(r,r+h)),melds:[]}),r+=h}const o=a.slice(r),l={seed:n.seed,dealer:e,players:s,wall:o,dead:[],offered:null,phase:{type:"discard",player:e},log:[{type:"new-game",dealer:e}],offerCounter:0};return rn(L(s[e].hand))&&(l.log.push({type:"dealt-win",player:e}),l.phase={type:"finished",winner:e,score:on(e,[],L(s[e].hand),null),reason:"dealt-win"}),l}function Z(n){return n.slice().sort((e,t)=>y(e)-y(t)||e.id-t.id)}function D(n){if(n.phase.type!=="respond"||!n.offered)return[];const e=n.players[n.phase.player].hand;return xn(L(e),y(n.offered),e.length)}function Nn(n){return structuredClone(n)}function Sn(n,e){const t=Nn(n);switch(e.type){case"discard":return In(t,e.player,e.cardId);case"eat":return Cn(t,e.player,e.option);case"pass":return Dn(t,e.player)}}function In(n,e,t){if(n.phase.type!=="discard"||n.phase.player!==e)throw new Error("Not this player’s discard phase");const a=n.players[e].hand,s=a.findIndex(o=>o.id===t);if(s<0)throw new Error("Card not in hand");const[r]=a.splice(s,1);return n.log.push({type:"discard",player:e,kind:y(r)}),K(n,r,ln(e),"discard")}function Cn(n,e,t){if(n.phase.type!=="respond"||n.phase.player!==e)throw new Error("Not this player’s respond phase");const a=n.offered;if(!a)throw new Error("No card on offer");const r=D(n).find(i=>i.kind===t.kind&&i.fromHand.length===t.fromHand.length&&i.fromHand.slice().sort().join()===t.fromHand.slice().sort().join());if(!r)throw new Error("Illegal capture");const o=n.players[e].hand,l=[a];for(const i of r.fromHand){const h=o.findIndex(d=>y(d)===i);if(h<0)throw new Error("Capture cards missing from hand");l.push(o.splice(h,1)[0])}return n.players[e].melds.push({kind:r.kind,cards:Z(l)}),n.offered=null,n.log.push({type:"eat",player:e,kind:y(a),meld:r.kind}),n.phase={type:"discard",player:e},n}function Dn(n,e){if(n.phase.type!=="respond"||n.phase.player!==e)throw new Error("Not this player’s respond phase");const t=n.offered;if(!t)throw new Error("No card on offer");const a=n.phase.source;if(n.offered=null,a==="discard"){if(n.dead.push(t),n.wall.length===0)return n.log.push({type:"wall-empty"}),n.phase={type:"finished",winner:null,score:null,reason:"wall-empty"},n;const s=n.wall.shift();return n.log.push({type:"draw",player:e,kind:y(s)}),K(n,s,e,"wall")}return n.log.push({type:"relay",player:e,kind:y(t)}),K(n,t,ln(e),"discard")}function K(n,e,t,a){const s=y(e);for(let r=0;r<N;r++){const o=(t+r)%N,l=L(n.players[o].hand);if(Ln(l,s)){l[s]++,n.players[o].hand.push(e),n.players[o].hand=Z(n.players[o].hand),n.offered=null;const i=n.players[o].melds.map(d=>({kind:d.kind,uses:d.cards.map(y)})),h=on(o,i,l,s);return n.log.push({type:"win",player:o,kind:s,lenh:h.lenh}),n.phase={type:"finished",winner:o,score:h,reason:"win"},n}}return n.offered=e,n.offerCounter++,n.phase={type:"respond",player:t,source:a,offerId:n.offerCounter},n}function cn(n){let e=-1,t=1/0,a=1/0;for(let s=0;s<P;s++){if(n[s]===0)continue;n[s]--;const r=z(n);n[s]++,(r<t||r===t&&n[s]<a)&&(t=r,a=n[s],e=s)}return{kind:e,leftover:t}}function Bn(n,e){const t=n.find(a=>y(a)===e);if(!t)throw new Error("AI chose a kind not in hand");return t}function On(n,e){for(const a of e.fromHand)n[a]--;const{leftover:t}=cn(n);for(const a of e.fromHand)n[a]++;return t}function dn(n){const e=n.phase;if(e.type==="discard"){const t=n.players[e.player].hand,{kind:a}=cn(L(t));return{type:"discard",player:e.player,cardId:Bn(t,a).id}}if(e.type==="respond"){const t=e.player,a=n.players[t].hand,s=L(a),r=D(n),o=r.find(d=>d.kind==="quad");if(o)return{type:"eat",player:t,option:o};const l=z(s);let i=null,h=l;for(const d of r){const f=On(s,d);f<h&&(h=f,i=d)}return i?{type:"eat",player:t,option:i}:{type:"pass",player:t}}throw new Error("Game already finished")}function An(n){const e=J[j(n)],t=R[C(n)];return`${m(n)} — ${t.en} ${e.en}`}function B(n,e="mini",t=""){const a=J[j(n)],s=R[C(n)];return`<div class="card ${C(n)} ${e}" ${t} title="${An(n)}">
    <span class="glyph">${a.glyph}</span>
    <span class="label">${a.vi} ${s.vi}</span>
  </div>`}function S(n,e="",t=""){return B(y(n),e,t)}const E=n=>R[C(n[0])].vi,hn={players:["You","Bot 1","Bot 2","Bot 3"],sub:"you vs 3 bots",tutorial:"Tutorial",rules:"Rules",newGame:"New game",langToggle:"Tiếng Việt",speedFast:"⏩ Fast",speedNormal:"▶ Normal",hintsOn:"🎓 Hints: on",hintsOff:"🎓 Hints: off",dealer:"Dealer",points:n=>`${n>=0?"+":""}${n} pts`,cardsInHand:n=>`${n} cards in hand`,oddCards:n=>`Unmatched cards: ${n}`,wallCount:n=>`Wall: ${n}`,deadCount:n=>`Burned: ${n}`,empty:"none yet",fromWall:"Wall card",fromDiscard:"Discarded card",stYouDiscard:"Your turn — pick a card to discard.",stAiDiscard:n=>`${n} is choosing a discard…`,stYouEat:n=>`Capture ${n}?`,stYouCantDiscardSrc:n=>`You can't use ${n} — draw from the wall.`,stYouCantWallSrc:n=>`You can't use ${n} — pass it on.`,stAiThinking:(n,e)=>`${n} is considering ${e}…`,stDrawGame:"Wall empty — draw game.",stWin:(n,e)=>`${n} wins — tới! (${e} lệnh)`,discardBtn:n=>`Discard ${n}`,discardHint:"Click a card to select it, click it again (or the button) to discard.",passDraw:"Pass — draw from the wall",passRelay:"Pass — hand it on",eatLabel:{pair:"Pair",triple:"Three alike",quad:"Quằn (4 alike)",tst:"Tướng-Sĩ-Tượng",xpm:"Xe-Pháo-Mã",pawns3:"Mixed Tốt",pawns4:"Mixed Tốt ×4",loneGeneral:"Lone Tướng"},meldLabel(n,e){switch(n){case"pair":return`Pair of ${m(e[0])}`;case"triple":return`Three ${m(e[0])}`;case"quad":return`Quằn — four ${m(e[0])}`;case"tst":return`Tướng-Sĩ-Tượng (${E(e)})`;case"xpm":return`Xe-Pháo-Mã (${E(e)})`;case"pawns3":return"3 Tốt, different colors";case"pawns4":return"4 Tốt, different colors";case"loneGeneral":return`Lone Tướng (${E(e)})`}},exposedTag:"(exposed)",resultTitle:"Round result",winnerLine:(n,e)=>`<strong>${n}</strong> wins${e?" straight from the deal (thiên tới)":""} — tới!`,drawLine:"The wall ran out before anyone completed a hand — this round is a draw.",winBonusRow:"Winning (tới)",totalRow:"Total",paysLine:(n,e)=>`Each losing player pays ${n} points. ${e} deals the next round.`,viewTable:"View table",hintDiscard:n=>`Hint: discard ${n} — it contributes least to completing your hand.`,hintEat:n=>`Hint: capture it — forming “${n}” brings you closer to winning.`,hintPass:"Hint: pass — no capture here would improve your hand.",logLine(n,e){switch(n.type){case"new-game":return`New round — ${e[n.dealer]} deals.`;case"dealt-win":return`${e[n.player]} wins on the deal (thiên tới)!`;case"discard":return`${e[n.player]} discarded ${m(n.kind)}.`;case"draw":return`${e[n.player]} drew from the wall: ${m(n.kind)}.`;case"relay":return`${e[n.player]} passed ${m(n.kind)} on.`;case"eat":return`${e[n.player]} captured ${m(n.kind)} (${hn.eatLabel[n.meld]}).`;case"win":return`${e[n.player]} — TỚI with ${m(n.kind)}: ${n.lenh} lệnh!`;case"wall-empty":return"Wall empty — draw game."}},rulesHTML:`
    <h2>How to play (short version)</h2>
    <p>The deck has 112 cards: 7 ranks (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) in
    4 colors, 4 copies each. The dealer gets 21 cards, everyone else 20. The
    goal: arrange <em>all</em> of your cards into valid groups.</p>
    <h3>Valid groups</h3>
    <ul>
      <li>2 / 3 / 4 identical cards (same rank <em>and</em> color)</li>
      <li>Tướng-Sĩ-Tượng of one color · Xe-Pháo-Mã of one color</li>
      <li>3 or 4 Tốt (soldiers), all different colors</li>
      <li>A lone Tướng (general) counts as a group by itself</li>
    </ul>
    <h3>Turns</h3>
    <ul>
      <li>The dealer opens by discarding a card. A discarded card is offered to the next player.</li>
      <li>That player may <strong>capture</strong> it ("ăn") — combining it with hand cards into a face-up group of 3+ — and then discard, or <strong>pass</strong> and flip a card from the wall.</li>
      <li>A flipped wall card they don't use is offered to the next player.</li>
      <li>If an offered card completes someone's whole hand, they <strong>win ("tới")</strong> instantly — the game detects this for you.</li>
      <li>If the wall runs out, the round is a draw.</li>
    </ul>
    <h3>Scoring (lệnh)</h3>
    <ul>
      <li>Pair: 0 · lone Tướng / color runs / 3 mixed Tốt: 1 · 4 mixed Tốt: 4</li>
      <li>3 alike: 1 exposed, 6 concealed (khạp) · 4 alike (quằn): 6 exposed, 8 concealed</li>
      <li>Winning adds +3; every loser pays the winner the full lệnh count.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Some traditional forced-capture and priority rules are simplified — see the README.</p>`},pn={players:["Bạn","Máy 1","Máy 2","Máy 3"],sub:"bạn + 3 máy",tutorial:"Hướng dẫn",rules:"Luật chơi",newGame:"Ván mới",langToggle:"English",speedFast:"⏩ Nhanh",speedNormal:"▶ Chậm",hintsOn:"🎓 Gợi ý: bật",hintsOff:"🎓 Gợi ý: tắt",dealer:"Cái",points:n=>`${n>=0?"+":""}${n} điểm`,cardsInHand:n=>`${n} lá trên tay`,oddCards:n=>`Bài lẻ: ${n} lá`,wallCount:n=>`Nọc: ${n} lá`,deadCount:n=>`Bài bỏ: ${n} lá`,empty:"chưa có",fromWall:"Bài nọc",fromDiscard:"Bài đánh ra",stYouDiscard:"Bạn: chọn một lá để đánh ra.",stAiDiscard:n=>`${n} đang chọn bài đánh…`,stYouEat:n=>`Bạn: có ăn ${n} không?`,stYouCantDiscardSrc:n=>`Bạn không ăn được ${n} — bốc nọc.`,stYouCantWallSrc:n=>`Bạn không ăn được ${n} — nhường qua.`,stAiThinking:(n,e)=>`${n} đang tính với ${e}…`,stDrawGame:"Hết nọc — ván hòa.",stWin:(n,e)=>`${n} tới! (${e} lệnh)`,discardBtn:n=>`Đánh ${n}`,discardHint:"Nhấn vào một lá để chọn, nhấn lần nữa (hoặc nhấn nút) để đánh ra.",passDraw:"Bỏ qua — bốc nọc",passRelay:"Không ăn — nhường qua",eatLabel:{pair:"Đôi",triple:"Ăn ba",quad:"Quằn",tst:"Tướng-Sĩ-Tượng",xpm:"Xe-Pháo-Mã",pawns3:"Tốt khác màu",pawns4:"Tốt khác màu ×4",loneGeneral:"Tướng lẻ"},meldLabel(n,e){switch(n){case"pair":return`Đôi ${m(e[0])}`;case"triple":return`Ba ${m(e[0])}`;case"quad":return`Quằn ${m(e[0])}`;case"tst":return`Tướng-Sĩ-Tượng ${E(e)}`;case"xpm":return`Xe-Pháo-Mã ${E(e)}`;case"pawns3":return"3 Tốt khác màu";case"pawns4":return"4 Tốt khác màu";case"loneGeneral":return`Tướng lẻ ${E(e)}`}},exposedTag:"(lộ)",resultTitle:"Kết quả",winnerLine:(n,e)=>`<strong>${n}</strong> tới${e?" ngay khi chia bài (thiên tới)":""}!`,drawLine:"Hết nọc mà chưa ai tới — ván này hòa, không ai ăn điểm.",winBonusRow:"Tới",totalRow:"Tổng",paysLine:(n,e)=>`Mỗi nhà thua trả ${n} điểm. ${e} làm cái ván sau.`,viewTable:"Xem bàn",hintDiscard:n=>`Gợi ý: đánh ${n} — lá này ít giúp bài của bạn nhất.`,hintEat:n=>`Gợi ý: nên ăn — ghép thành “${n}” giúp bạn gần tới hơn.`,hintPass:"Gợi ý: bỏ qua — ăn lúc này không giúp bài của bạn.",logLine(n,e){switch(n.type){case"new-game":return`Ván mới — ${e[n.dealer]} làm cái.`;case"dealt-win":return`${e[n.player]} tới ngay khi chia bài (thiên tới)!`;case"discard":return`${e[n.player]} đánh ${m(n.kind)}.`;case"draw":return`${e[n.player]} bốc nọc: ${m(n.kind)}.`;case"relay":return`${e[n.player]} không ăn, nhường ${m(n.kind)}.`;case"eat":return`${e[n.player]} ăn ${m(n.kind)} (${pn.eatLabel[n.meld]}).`;case"win":return`${e[n.player]} TỚI với ${m(n.kind)} — ${n.lenh} lệnh!`;case"wall-empty":return"Hết nọc — ván hòa."}},rulesHTML:`
    <h2>Luật chơi (bản rút gọn)</h2>
    <p>Bộ bài 112 lá: 7 quân (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) × 4 màu × 4 lá.
    Nhà cái nhận 21 lá, ba nhà kia 20 lá. Mục tiêu: sắp toàn bộ bài thành các nhóm hợp lệ.</p>
    <h3>Nhóm hợp lệ</h3>
    <ul>
      <li>Đôi / ba / bốn lá giống hệt nhau (cùng quân, cùng màu)</li>
      <li>Tướng-Sĩ-Tượng cùng màu · Xe-Pháo-Mã cùng màu</li>
      <li>3 hoặc 4 Tốt khác màu nhau</li>
      <li>Tướng lẻ một lá vẫn tính là một nhóm</li>
    </ul>
    <h3>Cách chơi</h3>
    <ul>
      <li>Nhà cái đánh 1 lá mở màn. Lá đánh ra được mời nhà kế tiếp.</li>
      <li>Người được mời có thể <strong>ăn</strong> (ghép thành nhóm ≥ 3 lá, lật lên bàn rồi đánh 1 lá) hoặc <strong>bỏ qua</strong> và bốc nọc.</li>
      <li>Lá nọc không ăn sẽ được nhường cho nhà kế tiếp.</li>
      <li>Ai ghép được lá đang mời để hoàn thành toàn bộ bài thì <strong>tới</strong> ngay (máy tự phát hiện).</li>
      <li>Hết nọc mà chưa ai tới thì hòa.</li>
    </ul>
    <h3>Tính lệnh</h3>
    <ul>
      <li>Đôi: 0 · Tướng lẻ / bộ ba màu / 3 Tốt: 1 · 4 Tốt khác màu: 4</li>
      <li>Ba lá giống: ăn lộ 1, giữ kín (khạp) 6 · Quằn: lộ 6, kín 8</li>
      <li>Tới cộng thêm 3 lệnh; mỗi nhà thua trả đủ số lệnh.</li>
    </ul>
    <p style="margin-top:6px;opacity:.75">Bản chơi này lược giản một số luật ăn ép/ưu tiên của tứ sắc truyền thống — xem README.</p>`},Gn={en:hn,vi:pn},p=(n,e)=>U(n,e),tn=(n,...e)=>`<div class="tut-cards">${e.map(t=>B(t,n)).join("")}</div>`,v=(...n)=>`<span class="tut-group">${n.map(e=>B(e,"mini")).join("")}</span>`;function qn(n){const e=tn("",p("general","red"),p("advisor","yellow"),p("elephant","green"),p("chariot","white"),p("cannon","red"),p("horse","yellow"),p("pawn","green")),t=tn("",p("general","red"),p("general","green"),p("general","yellow"),p("general","white")),a=`<div class="tut-cards">${v(p("cannon","red"),p("cannon","red"))}${v(p("horse","green"),p("horse","green"),p("horse","green"))}${v(p("chariot","yellow"),p("chariot","yellow"),p("chariot","yellow"),p("chariot","yellow"))}</div>`,s=`<div class="tut-cards">${v(p("general","red"),p("advisor","red"),p("elephant","red"))}${v(p("chariot","green"),p("cannon","green"),p("horse","green"))}${v(p("pawn","red"),p("pawn","green"),p("pawn","yellow"),p("pawn","white"))}${v(p("general","yellow"))}</div>`,r=`<div class="tut-cards">${v(p("cannon","white"),p("cannon","white"))} + ${B(p("cannon","white"),"mini")} → ${v(p("cannon","white"),p("cannon","white"),p("cannon","white"))}</div>`;return n==="vi"?[{title:"Bộ bài",body:`<p>Tứ sắc dùng 112 lá: 7 quân cờ tướng, mỗi quân in chữ Hán và tên tiếng Việt.</p>${e}
        <p>Mỗi quân có 4 màu (nền lá bài) — đỏ, xanh, vàng, trắng — mỗi màu 4 lá giống nhau.</p>${t}`},{title:"Mục tiêu",body:`<p>Nhà cái nhận 21 lá, ba nhà kia 20 lá. Mục tiêu là sắp <strong>toàn bộ</strong> bài của
        bạn thành các nhóm hợp lệ. Ai hoàn thành trước thì <strong>tới</strong> (thắng).</p>
        <p>Góc phải màn hình có số «bài lẻ» — số lá chưa vào nhóm nào. Về 0 là sắp tới!</p>`},{title:"Nhóm chẵn",body:`<p>Hai, ba hoặc bốn lá <strong>giống hệt nhau</strong> (cùng quân, cùng màu):
        đôi, ba con (giữ kín gọi là <em>khạp</em>), và bốn con (<em>quằn</em>).</p>${a}`},{title:"Nhóm lẻ",body:`<p>Các bộ khác màu sắc: <strong>Tướng-Sĩ-Tượng</strong> cùng màu,
        <strong>Xe-Pháo-Mã</strong> cùng màu, <strong>3–4 Tốt khác màu</strong>,
        và <strong>Tướng lẻ</strong> một mình cũng là một nhóm.</p>${s}`},{title:"Lượt chơi",body:`<p>Luôn có một lá được «mời» — lá vừa đánh ra hoặc lá lật từ nọc.</p>
        <p>Đến lượt, bạn có thể <strong>ăn</strong>: ghép lá mời với bài trên tay thành nhóm
        ≥ 3 lá, lật nhóm lên bàn, rồi đánh ra 1 lá.</p>${r}
        <p>Không ăn thì <strong>bỏ qua</strong>: lá mời bị bỏ, bạn bốc nọc. Lá nọc không ăn
        sẽ nhường cho nhà kế tiếp.</p>`},{title:"Tới & tính lệnh",body:`<p>Nếu lá đang mời hoàn thành toàn bộ bài của ai đó, người ấy <strong>tới</strong>
        ngay — máy tự phát hiện cho mọi nhà, kể cả bạn.</p>
        <p>Điểm tính bằng <strong>lệnh</strong>: đôi 0 · bộ ba màu / 3 Tốt / Tướng lẻ 1 ·
        4 Tốt 4 · khạp 6 · quằn 8 · tới +3. Mỗi nhà thua trả đủ số lệnh.</p>`},{title:"Sẵn sàng!",body:`<p>Mẹo: nhấn một lá để chọn, nhấn lần nữa để đánh. Theo dõi số «bài lẻ»
        và ăn để giảm nó.</p>
        <p>Bắt đầu ván tập với <strong>gợi ý</strong> bật sẵn — mỗi lượt máy sẽ chỉ cho bạn
        nước đi hợp lý và giải thích ngắn gọn.</p>`}]:[{title:"The deck",body:`<p>Tứ Sắc ("four colors") uses 112 cards — the 7 Chinese-chess pieces, each
      showing its Chinese character and Vietnamese name.</p>${e}
      <p>Every rank comes in 4 colors (the card background) — đỏ/red, xanh/green,
      vàng/yellow, trắng/white — with 4 identical copies of each.</p>${t}`},{title:"The goal",body:`<p>The dealer gets 21 cards, everyone else 20. Your goal is to arrange
      <strong>every card you hold</strong> into valid groups. The first player to do so
      <strong>wins ("tới")</strong>.</p>
      <p>The counter in your corner shows your <em>unmatched cards</em> — cards not yet in
      any group. Get it to zero and you're one card from winning!</p>`},{title:"Groups: identical cards",body:`<p>Two, three, or four <strong>identical</strong> cards (same rank <em>and</em>
      color): a pair, a triplet (kept hidden it's called a <em>khạp</em>), and a quad
      (<em>quằn</em>).</p>${a}`},{title:"Groups: runs & soldiers",body:`<p>Mixed groups: <strong>Tướng-Sĩ-Tượng</strong> (General-Advisor-Elephant) of one
      color, <strong>Xe-Pháo-Mã</strong> (Chariot-Cannon-Horse) of one color,
      <strong>3–4 Tốt (soldiers) of different colors</strong> — and a
      <strong>lone Tướng</strong> counts as a group by itself.</p>${s}`},{title:"A turn",body:`<p>There is always one card "on offer" — the last discard, or a card flipped
      from the wall.</p>
      <p>On your turn you may <strong>capture ("ăn")</strong>: combine the offered card with
      cards from your hand into a face-up group of 3+, then discard one card.</p>${r}
      <p>Or <strong>pass</strong>: the offer is burned and you flip the top wall card. If you
      don't use the flipped card, it's offered to the next player.</p>`},{title:"Winning & scoring",body:`<p>If an offered card completes someone's entire hand, they win
      (<strong>tới</strong>) on the spot — the game checks this automatically for every seat,
      including yours.</p>
      <p>Scores are counted in <strong>lệnh</strong>: pair 0 · color runs / 3 mixed Tốt /
      lone Tướng 1 · 4 mixed Tốt 4 · hidden triplet (khạp) 6 · quad (quằn) 8 · winning +3.
      Every loser pays the winner the full amount.</p>`},{title:"Ready to play!",body:`<p>Tip: click a card once to select, again to discard. Watch your
      <em>unmatched cards</em> counter and capture to shrink it.</p>
      <p>Start a practice game with <strong>hints on</strong> — every turn, the coach
      suggests a sensible move and explains it in one line.</p>`}]}const g=0;let c,un=0,k=null,q=!1,X=0,_=!1,O=W("tusac-chips",new Array(N).fill(0)),w=W("tusac-locale","en"),M=W("tusac-coach",!1),$=null;function u(){return Gn[w]}function W(n,e){try{const t=localStorage.getItem(n);if(t!==null)return JSON.parse(t)}catch{}return e}function H(n,e){try{localStorage.setItem(n,JSON.stringify(e))}catch{}}function V(){X++,k=null,_=!1,c=En({seed:(Date.now()^Math.random()*4294967295)>>>0,dealer:un}),T(),fn()}function I(n){c=Sn(c,n),k=null,T(),fn()}function fn(){if(c.phase.type==="finished"){Pn();return}if(c.phase.player!==g){const n=++X;setTimeout(()=>{n!==X||c.phase.type==="finished"||I(dn(c))},q?180:850)}}function Pn(){if(c.phase.type!=="finished"||_)return;_=!0;const{winner:n,score:e}=c.phase;n!==null&&e&&(O=O.map((t,a)=>a===n?t+e.lenh*(N-1):t-e.lenh),H("tusac-chips",O),un=n),T(),document.getElementById("result-dialog")?.showModal()}function jn(){if(!M||c.phase.type==="finished"||c.phase.player!==g)return null;const n=dn(c);if(n.type==="discard"){const e=c.players[g].hand.find(t=>t.id===n.cardId);return{action:n,text:u().hintDiscard(e?m(y(e)):"?")}}return n.type==="eat"?{action:n,text:u().hintEat(u().eatLabel[n.option.kind])}:{action:n,text:u().hintPass}}function Rn(n,e){return n.kind===e.kind&&n.fromHand.slice().sort().join()===e.fromHand.slice().sort().join()}function Wn(n,e=12){const t=Math.min(n,e);let a='<div class="backs">';for(let s=0;s<t;s++)a+='<div class="card mini back"></div>';return a+="</div>",a}function gn(n){const e=c.players[n].melds;return e.length===0?"":`<div class="melds">${e.map(t=>`<div class="meld">${t.cards.map(a=>S(a,"mini")).join("")}</div>`).join("")}</div>`}function mn(n){const e=O[n];return`<span class="chips ${e>0?"pos":e<0?"neg":""}">${u().points(e)}</span>`}function yn(n){return c.phase.type!=="finished"&&c.phase.player===n}function Y(n,e){const t=c.players[n];return`<section class="seat seat-${e} ${yn(n)?"active":""}">
    <div class="who">${u().players[n]}
      ${c.dealer===n?`<span class="badge">${u().dealer}</span>`:""}
      ${mn(n)}
    </div>
    <div class="hand-count">${u().cardsInHand(t.hand.length)}</div>
    ${Wn(t.hand.length)}
    ${gn(n)}
  </section>`}function Yn(){const n=c.phase,e=u();if(n.type==="finished")return n.winner===null?e.stDrawGame:e.stWin(e.players[n.winner],n.score?.lenh??0);if(n.type==="discard")return n.player===g?e.stYouDiscard:e.stAiDiscard(e.players[n.player]);const t=c.offered?m(y(c.offered)):"";return n.player===g?D(c).length>0?e.stYouEat(t):n.source==="discard"?e.stYouCantDiscardSrc(t):e.stYouCantWallSrc(t):e.stAiThinking(e.players[n.player],t)}function Kn(){const n=c.offered,e=c.phase.type==="respond"&&c.phase.source==="wall"?u().fromWall:u().fromDiscard,t=c.dead.slice(-14);return`<section class="center">
    <div class="status">${Yn()}</div>
    <div class="piles">
      <div class="pile">
        <div class="card back"></div>
        <span class="title">${u().wallCount(c.wall.length)}</span>
      </div>
      <div class="pile">
        ${n?S(n,"offered-big"):'<div class="card" style="opacity:.12"></div>'}
        <span class="title">${n?e:"—"}</span>
      </div>
      <div class="pile" style="min-width:0">
        <div class="dead-cards">${t.map(a=>S(a,"mini")).join("")||`<span style="opacity:.4;font-size:.8rem">${u().empty}</span>`}</div>
        <span class="title">${u().deadCount(c.dead.length)}</span>
      </div>
    </div>
    <div class="log" id="log">${c.log.slice(-60).map(a=>`<div>${u().logLine(a,u().players)}</div>`).join("")}</div>
  </section>`}function Xn(n,e,t){const a=c.offered;return`<button class="eat-opt ${t?"suggest":""}" data-action="eat" data-opt="${e}">
    <span class="opt-label">${u().eatLabel[n.kind]}</span>
    ${S(a,"mini")}
    ${n.fromHand.map(s=>B(s)).join("")}
  </button>`}function _n(n){const e=c.phase;if(e.type==="finished")return`<div class="actions"><button class="primary" data-action="new-game">${u().newGame}</button></div>`;if(e.player!==g)return"";if(e.type==="discard"){const r=k!==null?c.players[g].hand.find(o=>o.id===k):void 0;return`<div class="actions">
      ${r?`<button class="primary" data-action="confirm-discard">${u().discardBtn(m(y(r)))}</button>`:`<span class="hint">${u().discardHint}</span>`}
    </div>`}const t=D(c),a=n?.action.type==="pass",s=e.source==="discard"?u().passDraw:u().passRelay;return`<div class="actions">
    ${t.map((r,o)=>Xn(r,o,n?.action.type==="eat"&&Rn(n.action.option,r))).join("")}
    <button data-action="pass" class="${a?"suggest":""}">${s}</button>
  </div>`}function Vn(){const n=c.players[g],e=c.phase.type==="discard"&&c.phase.player===g,t=jn(),a=t?.action.type==="discard"?t.action.cardId:null,s=z(L(n.hand));return`<section class="seat seat-bottom ${yn(g)?"active":""}">
    <div class="who">${u().players[g]}
      ${c.dealer===g?`<span class="badge">${u().dealer}</span>`:""}
      ${mn(g)}
      <span class="hand-count" style="margin-left:auto">${u().oddCards(s)}</span>
    </div>
    ${gn(g)}
    <div class="hand">
      ${n.hand.map(r=>S(r,`${e?"clickable":""} ${r.id===k?"selected":""} ${r.id===a?"suggest":""}`,`data-action="select-card" data-card-id="${r.id}"`)).join("")}
    </div>
    ${t?`<div class="hint-bar">${t.text}</div>`:""}
    ${_n(t)}
  </section>`}function Fn(){if(c.phase.type!=="finished")return"";const{winner:n,score:e,reason:t}=c.phase,a=u();let s;if(n===null||!e)s=`<p>${a.drawLine}</p>`;else{const r=e.breakdown.map(o=>`<tr><td>${a.meldLabel(o.kind,o.uses)}${o.concealed?"":` <em>${a.exposedTag}</em>`}</td><td>${o.lenh}</td></tr>`).join("");s=`
      <p>${a.winnerLine(a.players[n],t==="dealt-win")}</p>
      <div class="result-cards">${c.players[n].hand.map(o=>S(o,"mini")).join("")}</div>
      <table class="score-table">
        ${r}
        <tr><td>${a.winBonusRow}</td><td>${e.winBonus}</td></tr>
        <tr class="total"><td>${a.totalRow}</td><td>${e.lenh} lệnh</td></tr>
      </table>
      <p style="margin-top:8px">${a.paysLine(e.lenh,a.players[n])}</p>`}return`<dialog id="result-dialog">
    <h2>${a.resultTitle}</h2>
    ${s}
    <div class="dialog-actions">
      <button data-action="close-dialog">${a.viewTable}</button>
      <button class="primary" data-action="new-game">${a.newGame}</button>
    </div>
  </dialog>`}function Qn(){if($===null)return"";const n=qn(w),e=Math.min($,n.length-1),t=n[e],a=e===n.length-1,s=w==="vi"?"Chơi ván tập (bật gợi ý)":"Start practice game (hints on)",r=n.map((o,l)=>`<span class="dot ${l===e?"on":""}"></span>`).join("");return`<dialog id="tutorial-dialog">
    <h2>${t.title} <span class="tut-progress">${e+1}/${n.length}</span></h2>
    ${t.body}
    <div class="tut-dots">${r}</div>
    <div class="dialog-actions">
      <button data-action="tut-close">${w==="vi"?"Đóng":"Close"}</button>
      ${e>0?`<button data-action="tut-prev">${w==="vi"?"‹ Trước":"‹ Back"}</button>`:""}
      ${a?`<button class="primary" data-action="tut-practice">${s}</button>`:`<button class="primary" data-action="tut-next">${w==="vi"?"Tiếp ›":"Next ›"}</button>`}
    </div>
  </dialog>`}function Un(){return`<dialog id="help-dialog">
    ${u().rulesHTML}
    <div class="dialog-actions">
      <button class="primary" data-action="close-dialog">${w==="vi"?"Đóng":"Close"}</button>
    </div>
  </dialog>`}function T(){const n=document.getElementById("app"),e=u();n.innerHTML=`
    <header>
      <h1>Bài Tứ Sắc</h1>
      <span class="sub">${e.sub}</span>
      <div class="controls">
        <button data-action="toggle-lang">${e.langToggle}</button>
        <button data-action="toggle-speed">${q?e.speedFast:e.speedNormal}</button>
        <button data-action="toggle-coach">${M?e.hintsOn:e.hintsOff}</button>
        <button data-action="tutorial">${e.tutorial}</button>
        <button data-action="help">${e.rules}</button>
        <button class="primary" data-action="new-game">${e.newGame}</button>
      </div>
    </header>
    <main class="table">
      ${Y(2,"top")}
      ${Y(1,"left")}
      ${Kn()}
      ${Y(3,"right")}
      ${Vn()}
    </main>
    ${Fn()}
    ${Un()}
    ${Qn()}
  `;const t=document.getElementById("log");t&&(t.scrollTop=t.scrollHeight),$!==null&&document.getElementById("tutorial-dialog")?.showModal()}function A(n=0){$=n,T()}function Jn(){$=null,H("tusac-tutorial-seen",!0),T(),c.phase.type==="finished"&&document.getElementById("result-dialog")?.showModal()}document.addEventListener("click",n=>{const e=n.target.closest("[data-action]");if(e)switch(e.dataset.action){case"new-game":document.getElementById("result-dialog")?.close(),V();break;case"help":document.getElementById("help-dialog")?.showModal();break;case"close-dialog":e.closest("dialog")?.close();break;case"toggle-speed":q=!q,T();break;case"toggle-lang":w=w==="en"?"vi":"en",H("tusac-locale",w),T();break;case"toggle-coach":M=!M,H("tusac-coach",M),T();break;case"tutorial":A();break;case"tut-next":$!==null&&A($+1);break;case"tut-prev":$!==null&&A(Math.max(0,$-1));break;case"tut-close":Jn();break;case"tut-practice":$=null,H("tusac-tutorial-seen",!0),M=!0,H("tusac-coach",M),V();break;case"select-card":{if(c.phase.type!=="discard"||c.phase.player!==g)break;const t=Number(e.dataset.cardId);k===t?I({type:"discard",player:g,cardId:t}):(k=t,T());break}case"confirm-discard":k!==null&&c.phase.type==="discard"&&c.phase.player===g&&I({type:"discard",player:g,cardId:k});break;case"eat":{if(c.phase.type!=="respond"||c.phase.player!==g)break;const t=D(c)[Number(e.dataset.opt)];t&&I({type:"eat",player:g,option:t});break}case"pass":c.phase.type==="respond"&&c.phase.player===g&&I({type:"pass",player:g});break}});V();W("tusac-tutorial-seen",!1)||A();
