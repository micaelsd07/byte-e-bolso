/**
 * Ilustração da tela inicial, desenhada por código: um notebook com código na
 * tela e uma moeda, que é o dinheiro do jogo. O desenho é fixo e próprio do
 * jogo: não leva dado do jogador nem imagem de fora.
 */
export function svgHeroi(): string {
  return (
    '<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="heroi-azul" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ba4ff"/><stop offset="1" stop-color="#2f5fe0"/></linearGradient>' +
    '<linearGradient id="heroi-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f0a91f"/></linearGradient>' +
    '</defs>' +
    '<ellipse cx="118" cy="186" rx="84" ry="9" fill="#0b0e1a" opacity="0.45"/>' +
    '<g transform="rotate(-9 120 100)">' +
    '<rect x="44" y="18" width="150" height="106" rx="16" fill="url(#heroi-azul)"/>' +
    '<rect x="56" y="30" width="126" height="82" rx="9" fill="#141a2b"/>' +
    '<path d="M78 58 67 69l11 11M98 58l11 11-11 11M92 52l-8 34" fill="none" stroke="#ffc93c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="122" y="54" width="46" height="6" rx="3" fill="#4d8dff"/>' +
    '<rect x="122" y="66" width="32" height="6" rx="3" fill="#3ddc97"/>' +
    '<rect x="122" y="78" width="40" height="6" rx="3" fill="#eef2ff" class="pisca"/>' +
    '<rect x="68" y="96" width="60" height="5" rx="2.5" fill="#34406b"/>' +
    '<path d="M26 130h186l-11 17a9 9 0 0 1-8 4H45a9 9 0 0 1-8-4z" fill="url(#heroi-azul)"/>' +
    '<rect x="98" y="135" width="42" height="5" rx="2.5" fill="#173a9a" opacity="0.55"/>' +
    '</g>' +
    '<g class="flutua">' +
    '<circle cx="188" cy="150" r="30" fill="#b97f08"/>' +
    '<circle cx="188" cy="145" r="30" fill="url(#heroi-ouro)"/>' +
    '<circle cx="188" cy="145" r="22" fill="none" stroke="#b97f08" stroke-width="2.5" opacity="0.5"/>' +
    '<path d="M188 131v28M195 137.5h-10.5a4.6 4.6 0 0 0 0 9.2h7a4.6 4.6 0 0 1 0 9.2H181" fill="none" stroke="#7a5200" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</g>' +
    '<path class="pisca" d="M34 40v12M28 46h12" stroke="#ffc93c" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="214" cy="52" r="4" fill="#4d8dff"/>' +
    '<circle cx="22" cy="118" r="3" fill="#3ddc97"/>' +
    '</svg>'
  );
}
