// OCRテキスト正規化関数のテスト

function normalizeOCRText(text) {
  if (!text) return '';

  return text
    // 日本語文字（ひらがな、カタカナ、漢字）間のスペースを除去
    .replace(/([ぁ-んァ-ヶー一-龠々]) +([ぁ-んァ-ヶー一-龠々])/g, '$1$2')
    // 日本語文字とひらがなの間のスペースを除去（例：「日 間」→「日間」）
    .replace(/([一-龠々]) +([ぁ-ん])/g, '$1$2')
    .replace(/([ぁ-ん]) +([一-龠々])/g, '$1$2')
    // 括弧内のスペースを除去
    .replace(/【 +/g, '【')
    .replace(/ +】/g, '】')
    .replace(/「 +/g, '「')
    .replace(/ +」/g, '」')
    .replace(/\( +/g, '(')
    .replace(/ +\)/g, ')')
    // 句読点前後の不要なスペースを除去
    .replace(/ +([。、,.])/g, '$1')
    .replace(/([。、,.]) +/g, '$1')
    // 数字と単位の間のスペースを除去（例: "1 0" → "10"）
    .replace(/(\d) +(\d)/g, '$1$2')
    // 数字と日本語の間のスペースを除去（例：「10 日」→「10日」）
    .replace(/(\d) +([ぁ-んァ-ヶー一-龠々])/g, '$1$2')
    // 連続するスペースを1つに
    .replace(/  +/g, ' ')
    .trim();
}

// テストケース
const ocrText = `剛 すす 本 ②》 中 介 57% 言 19:29
< 図 凸 四 :
【 重 要 】 予 診 票 の 印刷 に つい て
https:/bit.Iy/2VfT60h

接種 記録 書 に つい て は , 1 回 目 接種 時 に 「 接 種

日 」 を 記入 し , 「 ロ ッ ト シ ー ル 」 が 貼付 され て いる
も の を 持参 し て くだ さい 。
接種 当日 に ワク チン 接種 が 受け られ な く な っ た 方
は 、 接 種 当 日 15 時 まで に 089-955-9148 へ ご 連絡 く
た さい (接種 当日 は メー ル で の 受付 は 行っ て いま せ
ん 。 【<】
接種 当日 , 体調 が 悪い 方 は , ワク チン 接種 を 受け る
こと が で きま せん 。 ま た , コロ ナ 感 染 者 と 濃厚 接触
し た 疑い の ある 方 及び 特別 指定 地域 か ら 帰 県 後 1 0
日 間 経 っ て いな い 方 は , 接種 会 場 に 来場 で きま せ
ん 。`;

console.log("===== 元のOCRテキスト（一部） =====");
console.log(ocrText.substring(0, 200));
console.log("\n===== 正規化後のテキスト（一部） =====");
const normalized = normalizeOCRText(ocrText);
console.log(normalized.substring(0, 200));

console.log("\n===== 文字数の変化 =====");
console.log(`元のテキスト: ${ocrText.length}文字`);
console.log(`正規化後: ${normalized.length}文字`);
console.log(`削減率: ${Math.round((1 - normalized.length / ocrText.length) * 100)}%`);

// 特定パターンのテスト
console.log("\n===== 個別パターンのテスト =====");
const testCases = [
  ["【 重 要 】", "【重要】"],
  ["「 接 種 日 」", "「接種日」"],
  ["1 0 日 間", "10日間"],
  ["接種 記録 書", "接種記録書"],
  ["ワク チン 接種", "ワクチン接種"]
];

testCases.forEach(([input, expected]) => {
  const result = normalizeOCRText(input);
  console.log(`"${input}" → "${result}" (期待値: "${expected}") ${result === expected ? '✓' : '✗'}`);
});