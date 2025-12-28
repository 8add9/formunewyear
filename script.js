document.addEventListener('DOMContentLoaded', () => {
    // === 狀態變數 ===
    let displayValue = '0';
    let firstOperand = null;
    let waitingForSecondOperand = false;
    let operator = null;
    
    // TVM 變數 (Time Value of Money)
    // 預設值參考 TI BA II Plus 邏輯
    let tvm = {
        n: 0,
        iy: 0,
        pv: 0,
        pmt: 0,
        fv: 0
    };

    // 功能旗標
    let is2ndActive = false;
    let isComputing = false; // 按下 CPT 後為 true

    // === DOM 元素 ===
    const displayMain = document.getElementById('display-main');
    const indicator2nd = document.getElementById('indicator-2nd');
    const indicatorOp = document.getElementById('indicator-op');

    // === 核心顯示更新 ===
    function updateDisplay() {
        // 格式化數字：加入千分位，但保留小數點輸入時的邏輯
        let formatted;
        if (displayValue.endsWith('.')) {
            formatted = parseFloat(displayValue).toLocaleString('en-US') + '.';
        } else {
            // 處理浮點數精度問題，避免 0.1 + 0.2 = 0.300000004
            const num = parseFloat(displayValue);
            // 如果是極小的浮點數誤差，進行修剪
            formatted = Math.abs(num) < 1e15 ? parseFloat(num.toPrecision(12)) / 1 : num; 
            formatted = formatted.toLocaleString('en-US', { maximumFractionDigits: 9 });
        }
        
        displayMain.innerText = formatted;

        // 更新狀態指示燈
        indicator2nd.style.opacity = is2ndActive ? '1' : '0';
        indicatorOp.innerText = isComputing ? 'COMPUTING' : '';
    }

    // === 事件監聽 (Event Delegation) ===
    document.querySelector('.keypad').addEventListener('click', (event) => {
        const { target } = event;
        if (!target.matches('button')) return;

        const type = target.dataset.type;
        const value = target.dataset.value;

        // 根據按鈕類型分發處理
        switch (type) {
            case 'number':
                handleNumber(value);
                break;
            case 'operator':
                handleOperator(value);
                break;
            case 'calculate':
                handleEqual();
                break;
            case 'control':
                handleControl(value);
                break;
            case 'tvm':
                handleTVM(value);
                break;
            case 'func':
                handleFunction(value);
                break;
            case 'math':
                handleMath(value);
                break;
        }

        updateDisplay();
    });

    // === 處理數字輸入 ===
    function handleNumber(numStr) {
        // 如果剛按了 CPT，取消計算狀態
        if (isComputing) isComputing = false;

        if (waitingForSecondOperand) {
            displayValue = numStr;
            waitingForSecondOperand = false;
        } else {
            displayValue = displayValue === '0' ? numStr : displayValue + numStr;
        }
    }

    // === 處理標準運算符 (+ - * /) ===
    function handleOperator(nextOperator) {
        const inputValue = parseFloat(displayValue);

        if (operator && waitingForSecondOperand) {
            operator = nextOperator;
            return;
        }

        if (firstOperand === null) {
            firstOperand = inputValue;
        } else if (operator) {
            const result = performCalculation(operator, firstOperand, inputValue);
            displayValue = String(result);
            firstOperand = result;
        }

        waitingForSecondOperand = true;
        operator = nextOperator;
    }

    function performCalculation(op, first, second) {
        switch (op) {
            case '+': return first + second;
            case '-': return first - second;
            case '*': return first * second;
            case '/': return second === 0 ? 'Error' : first / second;
            default: return second;
        }
    }

    // === 處理等號 ===
    function handleEqual() {
        if (operator === null) return;
        const inputValue = parseFloat(displayValue);
        const result = performCalculation(operator, firstOperand, inputValue);
        displayValue = String(result);
        firstOperand = null;
        operator = null;
        waitingForSecondOperand = true;
    }

    // === 處理控制鍵 (2ND, CPT, ENTER, ON/C) ===
    function handleControl(action) {
        switch (action) {
            case 'ON/C':
                // 清除所有狀態 (類似重開機)
                displayValue = '0';
                firstOperand = null;
                waitingForSecondOperand = false;
                operator = null;
                is2ndActive = false;
                isComputing = false;
                // 注意：通常 ON/C 不會清除 TVM 記憶體，除非按 2ND + CLR TVM (這裡簡化為不清除 TVM)
                break;
            case '2ND':
                is2ndActive = !is2ndActive;
                break;
            case 'CPT':
                isComputing = true;
                // 用戶接下來應該按一個 TVM 鍵來計算
                break;
            case 'ENTER':
                // 這裡暫時作為確認鍵，主要邏輯在 TVM 輸入
                waitingForSecondOperand = true;
                break;
        }
    }

    // === 處理特殊功能 (CHS, Arrows) ===
    function handleFunction(func) {
        if (func === 'CHS') {
            displayValue = String(parseFloat(displayValue) * -1);
        }
        // Arrow functions reserved for future Cash Flow (CF) features
    }

    // === 處理數學功能 (SQRT) ===
    function handleMath(func) {
        const current = parseFloat(displayValue);
        if (func === 'SQRT') {
            displayValue = current < 0 ? 'Error' : String(Math.sqrt(current));
            waitingForSecondOperand = true;
        }
    }

    // === 處理 TVM (核心財務邏輯) ===
    function handleTVM(key) {
        const val = parseFloat(displayValue);

        // 1. 如果是計算模式 (剛按過 CPT)
        if (isComputing) {
            calculateTVM(key);
            isComputing = false; // 計算完畢，重置旗標
            waitingForSecondOperand = true; // 準備下一次輸入
            return;
        }

        // 2. 否則，這是「存入數值」的操作
        // 將螢幕上的數字存入對應的變數
        switch (key) {
            case 'N': tvm.n = val; break;
            case 'IY': tvm.iy = val; break;
            case 'PV': tvm.pv = val; break;
            case 'PMT': tvm.pmt = val; break;
            case 'FV': tvm.fv = val; break;
        }
        
        // UI 反饋：清除螢幕準備下一個輸入 (模擬真實計算機行為)
        waitingForSecondOperand = true; 
        
        // Debug 用：可以在 console 看到當前儲存的值
        console.log('TVM Stored:', tvm);
    }

    // === TVM 計算引擎 ===
    function calculateTVM(targetKey) {
        // 提取變數 (利率需轉為小數，例如輸入 5 代表 5%)
        let n = tvm.n;
        let r = tvm.iy / 100; 
        let pv = tvm.pv;
        let pmt = tvm.pmt;
        let fv = tvm.fv;

        let result = 0;

        // 公式邏輯：
        // 基礎公式: PV + PMT * [ (1 - (1+r)^-n) / r ] + FV * (1+r)^-n = 0
        // 注意現金流符號：流入為正，流出為負 (CFA 標準)

        try {
            switch (targetKey) {
                case 'FV':
                    // 計算 FV
                    if (r === 0) {
                        result = -(pv + pmt * n);
                    } else {
                        const term = Math.pow(1 + r, n);
                        result = - (pv * term + pmt * (term - 1) / r);
                    }
                    tvm.fv = result; // 更新記憶體
                    break;

                case 'PV':
                    // 計算 PV
                    if (r === 0) {
                        result = -(fv + pmt * n);
                    } else {
                        const term = Math.pow(1 + r, -n); // (1+r)^-n
                        const annuityFactor = (1 - term) / r;
                        result = -(fv * term + pmt * annuityFactor);
                    }
                    tvm.pv = result;
                    break;

                case 'PMT':
                    // 計算 PMT
                    if (r === 0) {
                        result = -(pv + fv) / n;
                    } else {
                        const term = Math.pow(1 + r, -n);
                        const annuityFactor = (1 - term) / r;
                        // PV + PMT * AF + FV * term = 0
                        // PMT * AF = -PV - FV * term
                        result = (-pv - fv * term) / annuityFactor;
                    }
                    tvm.pmt = result;
                    break;

                case 'N':
                    // 計算 N (期數)
                    // 使用 Log 求解
                    // 這種情況較複雜，這裡提供標準公式解
                    if (r === 0) {
                        result = -(pv + fv) / pmt;
                    } else {
                        // Formula: N = ln( (PMT - FV*r) / (PMT + PV*r) ) / ln(1+r)
                        // 注意：這需要符號正確匹配，否則 log 內會是負數 (Error)
                        const numerator = pmt - fv * r;
                        const denominator = pmt + pv * r;
                        if ((numerator / denominator) <= 0) {
                            result = NaN; // 無解 (符號設定錯誤)
                        } else {
                            result = Math.log(numerator / denominator) / Math.log(1 + r);
                        }
                    }
                    tvm.n = result;
                    break;
                
                case 'IY':
                    // 計算 I/Y (利率)
                    // 這通常需要迭代法 (Newton-Raphson)，簡單公式無法求解。
                    // 為了此專案範疇，若為簡單單利可回傳，複雜年金暫時顯示提示
                    alert("計算 I/Y 需要複雜迭代算法，此輕量版暫僅支援 PV/FV/PMT/N 的計算。");
                    return; 
            }

            if (isNaN(result) || !isFinite(result)) {
                displayValue = "Error";
            } else {
                displayValue = String(result);
            }

        } catch (e) {
            displayValue = "Error";
            console.error(e);
        }
    }
});
