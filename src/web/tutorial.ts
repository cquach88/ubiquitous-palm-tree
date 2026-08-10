/**
 * Tutorial mode: a short illustrated walkthrough of the rules, ending with an
 * optional practice game where the coach suggests a move every turn.
 */

import { kindIndex } from '../core';
import type { Color, Rank } from '../core';
import { kindCardHTML } from './cards';
import type { Locale } from './i18n';

const K = (rank: Rank, color: Color) => kindIndex(rank, color);

const cards = (cls: string, ...kinds: number[]) =>
  `<div class="tut-cards">${kinds.map((k) => kindCardHTML(k, cls)).join('')}</div>`;

const group = (...kinds: number[]) =>
  `<span class="tut-group">${kinds.map((k) => kindCardHTML(k, 'mini')).join('')}</span>`;

export interface Slide {
  title: string;
  body: string;
}

export function tutorialSlides(locale: Locale): Slide[] {
  const allRanks = cards(
    '',
    K('general', 'red'),
    K('advisor', 'yellow'),
    K('elephant', 'green'),
    K('chariot', 'white'),
    K('cannon', 'red'),
    K('horse', 'yellow'),
    K('pawn', 'green'),
  );
  const fourColors = cards(
    '',
    K('general', 'red'),
    K('general', 'green'),
    K('general', 'yellow'),
    K('general', 'white'),
  );
  const evenGroups = `<div class="tut-cards">${group(
    K('cannon', 'red'), K('cannon', 'red'),
  )}${group(
    K('horse', 'green'), K('horse', 'green'), K('horse', 'green'),
  )}${group(
    K('chariot', 'yellow'), K('chariot', 'yellow'), K('chariot', 'yellow'), K('chariot', 'yellow'),
  )}</div>`;
  const oddGroups = `<div class="tut-cards">${group(
    K('general', 'red'), K('advisor', 'red'), K('elephant', 'red'),
  )}${group(
    K('chariot', 'green'), K('cannon', 'green'), K('horse', 'green'),
  )}${group(
    K('pawn', 'red'), K('pawn', 'green'), K('pawn', 'yellow'), K('pawn', 'white'),
  )}${group(K('general', 'yellow'))}</div>`;
  const captureExample = `<div class="tut-cards">${group(
    K('cannon', 'white'), K('cannon', 'white'),
  )} + ${kindCardHTML(K('cannon', 'white'), 'mini')} → ${group(
    K('cannon', 'white'), K('cannon', 'white'), K('cannon', 'white'),
  )}</div>`;

  if (locale === 'vi') {
    return [
      {
        title: 'Bộ bài',
        body: `<p>Tứ sắc dùng 112 lá: 7 quân cờ tướng, mỗi quân in chữ Hán và tên tiếng Việt.</p>${allRanks}
        <p>Mỗi quân có 4 màu (nền lá bài) — đỏ, xanh, vàng, trắng — mỗi màu 4 lá giống nhau.</p>${fourColors}`,
      },
      {
        title: 'Mục tiêu',
        body: `<p>Nhà cái nhận 21 lá, ba nhà kia 20 lá. Mục tiêu là sắp <strong>toàn bộ</strong> bài của
        bạn thành các nhóm hợp lệ. Ai hoàn thành trước thì <strong>tới</strong> (thắng).</p>
        <p>Góc phải màn hình có số «bài lẻ» — số lá chưa vào nhóm nào. Về 0 là sắp tới!</p>`,
      },
      {
        title: 'Nhóm chẵn',
        body: `<p>Hai, ba hoặc bốn lá <strong>giống hệt nhau</strong> (cùng quân, cùng màu):
        đôi, ba con (giữ kín gọi là <em>khạp</em>), và bốn con (<em>quằn</em>).</p>${evenGroups}`,
      },
      {
        title: 'Nhóm lẻ',
        body: `<p>Các bộ khác màu sắc: <strong>Tướng-Sĩ-Tượng</strong> cùng màu,
        <strong>Xe-Pháo-Ngựa</strong> cùng màu, <strong>3–4 Tốt khác màu</strong>,
        và <strong>Tướng lẻ</strong> một mình cũng là một nhóm.</p>${oddGroups}`,
      },
      {
        title: 'Lượt chơi',
        body: `<p>Luôn có một lá được «mời» — lá vừa đánh ra hoặc lá lật từ nọc.</p>
        <p>Đến lượt, bạn có thể <strong>ăn</strong>: ghép lá mời với bài trên tay thành nhóm
        ≥ 3 lá, lật nhóm lên bàn, rồi đánh ra 1 lá.</p>${captureExample}
        <p>Không ăn thì <strong>bỏ qua</strong>: lá mời bị bỏ, bạn bốc nọc. Lá nọc không ăn
        sẽ nhường cho nhà kế tiếp.</p>`,
      },
      {
        title: 'Tới & tính lệnh',
        body: `<p>Nếu lá đang mời hoàn thành toàn bộ bài của ai đó, người ấy <strong>tới</strong>
        ngay — máy tự phát hiện cho mọi nhà, kể cả bạn.</p>
        <p>Điểm tính bằng <strong>lệnh</strong>: đôi 0 · bộ ba màu / 3 Tốt / Tướng lẻ 1 ·
        4 Tốt 4 · khạp 6 · quằn 8 · tới +7. Chỉ người tới được cộng điểm vào bảng điểm.</p>`,
      },
      {
        title: 'Sẵn sàng!',
        body: `<p>Mẹo: nhấn một lá để chọn, nhấn lần nữa để đánh. Theo dõi số «bài lẻ»
        và ăn để giảm nó.</p>
        <p>Bắt đầu ván tập với <strong>gợi ý</strong> bật sẵn — mỗi lượt máy sẽ chỉ cho bạn
        nước đi hợp lý và giải thích ngắn gọn.</p>`,
      },
    ];
  }

  return [
    {
      title: 'The deck',
      body: `<p>Tứ Sắc ("four colors") uses 112 cards — the 7 Chinese-chess pieces, each
      showing its Chinese character and Vietnamese name.</p>${allRanks}
      <p>Every rank comes in 4 colors (the card background) — đỏ/red, xanh/green,
      vàng/yellow, trắng/white — with 4 identical copies of each.</p>${fourColors}`,
    },
    {
      title: 'The goal',
      body: `<p>The dealer gets 21 cards, everyone else 20. Your goal is to arrange
      <strong>every card you hold</strong> into valid groups. The first player to do so
      <strong>wins ("tới")</strong>.</p>
      <p>The counter in your corner shows your <em>unmatched cards</em> — cards not yet in
      any group. Get it to zero and you're one card from winning!</p>`,
    },
    {
      title: 'Groups: identical cards',
      body: `<p>Two, three, or four <strong>identical</strong> cards (same rank <em>and</em>
      color): a pair, a triplet (kept hidden it's called a <em>khạp</em>), and a quad
      (<em>quằn</em>).</p>${evenGroups}`,
    },
    {
      title: 'Groups: runs & soldiers',
      body: `<p>Mixed groups: <strong>Tướng-Sĩ-Tượng</strong> (General-Advisor-Elephant) of one
      color, <strong>Xe-Pháo-Ngựa</strong> (Chariot-Cannon-Horse) of one color,
      <strong>3–4 Tốt (soldiers) of different colors</strong> — and a
      <strong>lone Tướng</strong> counts as a group by itself.</p>${oddGroups}`,
    },
    {
      title: 'A turn',
      body: `<p>There is always one card "on offer" — the last discard, or a card flipped
      from the wall.</p>
      <p>On your turn you may <strong>capture ("ăn")</strong>: combine the offered card with
      cards from your hand into a face-up group of 3+, then discard one card.</p>${captureExample}
      <p>Or <strong>pass</strong>: the offer is burned and you flip the top wall card. If you
      don't use the flipped card, it's offered to the next player.</p>`,
    },
    {
      title: 'Winning & scoring',
      body: `<p>If an offered card completes someone's entire hand, they win
      (<strong>tới</strong>) on the spot — the game checks this automatically for every seat,
      including yours.</p>
      <p>Scores are counted in <strong>lệnh</strong>: pair 0 · color runs / 3 mixed Tốt /
      lone Tướng 1 · 4 mixed Tốt 4 · hidden triplet (khạp) 6 · quad (quằn) 8 · winning +7.
      Only the winner scores — their total is added to their running tally.</p>`,
    },
    {
      title: 'Ready to play!',
      body: `<p>Tip: click a card once to select, again to discard. Watch your
      <em>unmatched cards</em> counter and capture to shrink it.</p>
      <p>Start a practice game with <strong>hints on</strong> — every turn, the coach
      suggests a sensible move and explains it in one line.</p>`,
    },
  ];
}
