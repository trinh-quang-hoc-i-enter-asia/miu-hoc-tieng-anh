// Lời hướng dẫn tiếng Việt dùng chung cho mọi bài (mã bắt đầu bằng "ui-").
// Seed nạp các câu này vào bảng phrases; gói bài nào cũng kèm đủ nhóm này.

export const UI = {
  tipListen: "ui-tip-listen",
  listenAgain: "ui-listen-again",
  tryAgain: "ui-try-again",
  sayIntro: "ui-say-intro",
  sayNext: "ui-say-next",
  sayTurn: "ui-say-turn",
  rest: "ui-rest",
  praise: ["ui-praise-1", "ui-praise-2", "ui-praise-3", "ui-praise-4"],
} as const;

export const UI_PHRASES: { slug: string; textVi: string }[] = [
  { slug: UI.tipListen, textVi: "Con nghe rồi chạm vào hình đúng nhé!" },
  { slug: UI.listenAgain, textVi: "Con nghe lại nhé!" },
  { slug: UI.tryAgain, textVi: "Con thử lại nhé!" },
  { slug: UI.sayIntro, textVi: "Con nghe Miu nói nhé!" },
  { slug: UI.sayNext, textVi: "Con nghe câu tiếp theo nào!" },
  { slug: UI.sayTurn, textVi: "Đến lượt con! Chạm vào micro rồi nói theo Miu." },
  { slug: UI.rest, textVi: "Hôm nay con học đủ rồi. Hẹn mai gặp lại nhé!" },
  { slug: "ui-praise-1", textVi: "Giỏi lắm!" },
  { slug: "ui-praise-2", textVi: "Đúng rồi!" },
  { slug: "ui-praise-3", textVi: "Tuyệt vời!" },
  { slug: "ui-praise-4", textVi: "Con giỏi quá!" },
];
