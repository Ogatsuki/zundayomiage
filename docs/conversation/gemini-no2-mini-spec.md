# =================================================================
# ミニ仕様書 実践例: ショッピングカート機能 (FCIS+SMAC準拠版)
# Version: 3.0.0
#
# `micro-spec-framework.yml`に基づき、FCIS+SMACアーキテクチャの
# 3層(Core, State, Shell)の責務を明確にした仕様を定義します。
# `implementationLogicSpec` を追加し、実装ロジックを分離。
# =================================================================

# =================================================================
# Layer 1: Functional Core (WHAT - 何をするか)
# =================================================================

# ---
# ミニ仕様書: データ構造 (Product)
# ---
- specId: MS-DATA-002
  specType: DATA_STRUCTURE
# ... (変更なし) ...
  specLayer: Core
  name: Product
  description: 販売する商品の基本データ構造を定義する。
  definition:
    language: TypeScript
    code: |
      interface Product {
        id: string;
        name: string;
        price: number;
      }
  constraints:
    - "idは、空文字列であってはならない。"
    - "nameは、空文字列であってはならない。"
    - "priceは、0以上の数値でなければならない。"
  dependencies: []

# ---
# ミニ仕様書: データ構造 (CartItem)
# ---
- specId: MS-DATA-003
  specType: DATA_STRUCTURE
# ... (変更なし) ...
  specLayer: Core
  name: CartItem
  description: ショッピングカート内の一つの商品を表現するデータ構造。
  definition:
    language: TypeScript
    code: |
      interface CartItem {
        product: Product;
        quantity: number;
      }
  constraints:
    - "quantityは、1以上の整数でなければならない。"
  dependencies:
    - MS-DATA-002

# ---
# ミニ仕様書: 関数 (addToCart)
# ---
- specId: MS-FUNC-002
  specType: FUNCTION
  specLayer: Core
  name: addToCart
  description: |
    現在のカート状態と追加したい商品を引数に取り、
    商品が追加された「新しい」カートの状態を返す純粋関数。
  # 契約定義
  definition:
    language: TypeScript
    code: |
      function addToCart(
        currentCart: CartItem[],
        productToAdd: Product,
        quantity: number
      ): CartItem[]
  
  # ✨[NEW]✨ 実装ロジック仕様書への参照
  implementationLogicSpec: ./specs/MS-FUNC-002.logic.md

  # 振る舞いの制約
  constraints:
    - "副作用を伴ってはならない（純粋関数であること）。"
    - "入力された`currentCart`配列は変更してはならない（非破壊的であること）。"
    - "追加しようとする`productToAdd`が既にカートに存在する場合、数量を加算する。"
    - "追加しようとする`productToAdd`がカートにない場合、新しい`CartItem`として末尾に追加する。"
    - "引数の`quantity`が1未満の場合は、カートを変更せず元のカート配列をそのまま返す。"
  # 受け入れ基準
  acceptanceCriteria:
    - given: "cart=[], product={id:'A'}, quantity=2"
      then: "戻り値は [{ product: {id:'A'}, quantity: 2 }] となる。"
    - given: "cart=[{product:{id:'A'}, quantity:1}], product={id:'A'}, quantity=2"
      then: "戻り値は [{ product: {id:'A'}, quantity: 3 }] となる。"
  dependencies:
    - MS-DATA-002
    - MS-DATA-003

# =================================================================
# Layer 2: State Machine (WHEN - いつ実行するか)
# =================================================================
- specId: MS-SMAC-001
  specType: STATE_MACHINE
# ... (変更なし) ...
  specLayer: State
  name: CartMachine
  description: |
    ショッピングカートの状態遷移を管理するステートマシン。
    非同期処理を含むカートの振る舞いを厳密に定義する。
  definition:
    language: XState
    context:
      items: []
      error: null
    states:
      idle:
        description: "通常状態。ユーザー操作を待つ。"
        on:
          ADD_ITEM:   { target: 'updating' }
      updating:
        description: "カートを更新中。API通信などを想定。"
        invoke:
          src: 'updateCartInBackend'
          onDone:
            target: 'idle'
            actions: ['updateCartItems']
          onError:
            target: 'error'
            actions: ['setErrorMessage']
      error:
        description: "更新処理でエラーが発生した状態。"
        on:
          RETRY: { target: 'updating' }
          DISMISS: { target: 'idle' }
  actions:
    updateCartItems:
      description: "Coreロジック(`addToCart`)を呼び出し、カートのアイテムリストを更新する。"
      dependencies: [MS-FUNC-002]
    setErrorMessage:
      description: "発生したエラーメッセージをcontextに保存する。"

# =================================================================
# Layer 3: Imperative Shell (HOW - どのように実行するか)
# =================================================================
- specId: MS-SHELL-001
  specType: SHELL_COMPONENT
# ... (変更なし) ...
  specLayer: Shell
  name: CartComponent
  description: |
    カート機能のUIを担当するReactコンポーネント。
    `CartMachine`と連携し、UIの表示とユーザー操作の橋渡しを行う。
  definition:
    language: React (TypeScript)
    props: {}
    responsibilities:
      - "内部で`CartMachine`をインスタンス化し、その状態を購読する。"
      - "`CartMachine`の現在の状態 (`idle`, `updating`, `error`) に応じてUIを切り替える。"
      - "カート内の商品リスト(`machine.context.items`)を画面に描画する。"
      - "ユーザーが「カートに追加」ボタンをクリックした際、`ADD_ITEM`イベントを`CartMachine`に送信する。"
  dependencies:
    - MS-SMAC-001