# Why 75% Is a Reasonable Confidence Threshold in TunaEye

TunaEye uses **75% model confidence** (`ACCEPT_CONFIDENCE = 75`) as the decision boundary between **direct automatic acceptance** (for Grade A and Grade B) and **escalated verification** (Tail-Cut second look or Supervisor PIN override).

## 1. Strong Majority Across 4 Classes
The classifier scores 4 mutually exclusive classes (`GRADE_A`, `GRADE_B`, `GRADE_C`, `INVALID`):
- Uniform random chance is **25%**.
- At **≥ 75%**, the winning grade carries at least **3× the combined probability** of all three remaining classes (`≤ 25%` total residual uncertainty).
- Below **75%**, competing classes can easily hold 25–45% probability, which means the Sashibo core cut alone is genuinely ambiguous.

## 2. Asymmetric Financial Risk per Fish
For an average **85 kg** yellowfin tuna (`₱420/kg` Grade A, `₱350/kg` Grade B, `₱280/kg` Grade C):
- Misclassifying **Grade A ↔ Grade B** shifts total value by **₱5,950**.
- Misclassifying **Grade A ↔ Grade C** shifts total value by **₱11,900**.
Setting the bar at **75%** prevents low-confidence guesses from printing binding receipts while still letting clear Grade A/B cores (`75.5%–99%`) go straight to print in one step.

## 3. Balanced Throughput vs. Escalation
- **Too low (e.g., 55–65%):** Ambiguous Sashibo cuts bypass Tail-Cut verification, increasing grading disputes at the dock.
- **Too high (e.g., 90–95%):** Normal biological variation in valid Grade A/B Sashibo cores would unnecessarily trigger Tail-Cut captures or Supervisor PIN locks, slowing down the line.
- **75% sweet spot:** Clear samples move at full dock speed; borderline samples (`< 75%`) automatically gather a second angle (**Tail-Cut**).

## 4. Safe Fallback Policy
- **Core `< 75%` or `Grade C`:** Requests a **Tail-Cut** check to combine two independent cuts.
- **No Tail-Cut available + Core `60–74.9%`:** Recorded transparently as **Provisional**.
- **Combined `< 75%` or severe `A ↔ C` disagreement:** Locks behind **Supervisor PIN** (`Manual override required`) so human judgment stays in control.
