

# Fee Card System - Complete Fix Plan

## Problems Identified

### Problem 1: Fee Type Mismatch Causing Zero Balance
The system defaults to selecting "Tuition" fee type, but only "Annual" exists in `fee_type_structures` for the student's grade level. This causes:
- `feeMatrix` to calculate `annualAmount: 0` and `monthlyAmount: 0`
- `totals.balance = 0` even though the student owes Rs. 20,000
- The student appears to have no fees

**Evidence from database:**
- `fee_type_structures` only contains: `Annual` (Rs. 20,000 for grade 10)
- UI defaults to `selectedFeeTypes = ["Tuition"]` which doesn't exist

### Problem 2: Cannot Receive Payments
- The "Receive Payment" button just navigates away to `/admin/fee-management`
- No way to record payments directly on the Fee Card page
- The legacy model requires:
  - Payments recorded directly against the student
  - No dependency on `student_fees` junction table
  - Simple append-only ledger in `fee_payments`

### Problem 3: PDF Grid Not Reflecting Payments
- The "Paid" row always shows "-" regardless of actual payments
- No logic to distribute `totalPaid` across months visually
- Arrears calculation doesn't account for payments made

---

## Solution Architecture

### Rule 1: Default to Available Fee Types
```text
On student selection:
  1. Fetch fee_type_structures for student's grade
  2. Auto-select the first available fee type (e.g., "Annual")
  3. Show only fee types that exist for this grade
```

### Rule 2: Direct Payment Recording
```text
Receive Payment button opens inline dialog:
  1. Enter payment amount
  2. Select payment method
  3. Record directly to fee_payments
  4. Refresh balance immediately
```

### Rule 3: Payments Reduce Balance Only
```text
Balance = Sum(annual_amounts) - Discount - Sum(payments)

- NO per-month tracking
- NO "paid months" concept
- Single running balance
```

### Rule 4: PDF Grid is Visual Only
```text
Grid shows monthly structure for reference:
  - Each month shows the monthly fee amount
  - Arrears carry forward visually
  - Paid row shows "-" (no month-level payment tracking)
  - Current month highlighted
```

---

## File Changes Required

### 1. StudentFeeCard.tsx

**Fix 1: Auto-select Available Fee Types**
```typescript
// After fetching fee structures, auto-select available types
useEffect(() => {
  if (feeTypeStructures.length > 0) {
    // Get unique fee types from structures
    const availableTypes = [...new Set(feeTypeStructures.map(f => f.fee_type_name))];
    
    // If currently selected types don't exist, select first available
    const validSelected = selectedFeeTypes.filter(t => 
      availableTypes.includes(t)
    );
    
    if (validSelected.length === 0 && availableTypes.length > 0) {
      setSelectedFeeTypes([availableTypes[0]]);
    }
  }
}, [feeTypeStructures]);
```

**Fix 2: Add Payment Recording Dialog**
```typescript
// New states
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
const [paymentAmount, setPaymentAmount] = useState("");
const [paymentMethod, setPaymentMethod] = useState("cash");
const [paymentLoading, setPaymentLoading] = useState(false);

// Direct payment recording function
const handleReceivePayment = async () => {
  if (!selectedStudent || !paymentAmount) {
    toast.error("Please enter payment amount");
    return;
  }

  const amount = parseFloat(paymentAmount);
  if (isNaN(amount) || amount <= 0) {
    toast.error("Please enter a valid amount");
    return;
  }

  setPaymentLoading(true);
  try {
    // First ensure student_fee record exists (create if needed)
    let studentFeeId = null;
    
    // Check if student_fee exists
    const { data: existingFee } = await supabase
      .from("student_fees")
      .select("id")
      .eq("student_id", selectedStudent.id)
      .maybeSingle();

    if (existingFee) {
      studentFeeId = existingFee.id;
    } else {
      // Create a fee record (required for payment foreign key)
      // Find or create a fee structure reference
      const { data: feeStructure } = await supabase
        .from("fee_structures")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!feeStructure) {
        // Create a generic fee structure
        const { data: newStructure } = await supabase
          .from("fee_structures")
          .insert({
            name: "Student Fee",
            amount: totals.total,
            fee_type: "tuition"
          })
          .select("id")
          .single();
        
        if (newStructure) {
          const { data: newFee } = await supabase
            .from("student_fees")
            .insert({
              student_id: selectedStudent.id,
              fee_structure_id: newStructure.id,
              amount: totals.total,
              final_amount: totals.netTotal,
              discount: discount,
              due_date: dueDate,
              status: "pending"
            })
            .select("id")
            .single();
          
          if (newFee) studentFeeId = newFee.id;
        }
      } else {
        const { data: newFee } = await supabase
          .from("student_fees")
          .insert({
            student_id: selectedStudent.id,
            fee_structure_id: feeStructure.id,
            amount: totals.total,
            final_amount: totals.netTotal,
            discount: discount,
            due_date: dueDate,
            status: "pending"
          })
          .select("id")
          .single();
        
        if (newFee) studentFeeId = newFee.id;
      }
    }

    if (!studentFeeId) {
      toast.error("Failed to create fee record");
      return;
    }

    // Record the payment
    const { error } = await supabase
      .from("fee_payments")
      .insert({
        student_fee_id: studentFeeId,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString()
      });

    if (error) throw error;

    toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded`);
    setPaymentDialogOpen(false);
    setPaymentAmount("");
    
    // Refresh data
    fetchStudentFeeData(selectedStudent.id);
  } catch (error) {
    console.error("Payment error:", error);
    toast.error("Failed to record payment");
  } finally {
    setPaymentLoading(false);
  }
};
```

**Fix 3: Update handleReceive to open dialog**
```typescript
const handleReceive = () => {
  if (!selectedStudent) {
    toast.error("Please select a student first");
    return;
  }
  setPaymentDialogOpen(true);
};
```

**Fix 4: Add Payment Dialog UI**
```tsx
<Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Receive Payment</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Student</Label>
        <Input value={selectedProfile?.full_name || ""} disabled />
      </div>
      <div>
        <Label>Current Balance</Label>
        <Input value={`Rs. ${totals.balance.toLocaleString()}`} disabled />
      </div>
      <div>
        <Label>Payment Amount</Label>
        <Input
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>
      <div>
        <Label>Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank">Bank Transfer</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleReceivePayment} disabled={paymentLoading}>
        {paymentLoading ? "Processing..." : "Record Payment"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**Fix 5: Show only available fee types in checkbox list**
```typescript
// Get available fee types for current student's grade
const availableFeeTypes = useMemo(() => {
  if (feeTypeStructures.length === 0) return feeTypes;
  return [...new Set(feeTypeStructures.map(f => f.fee_type_name))];
}, [feeTypeStructures, feeTypes]);
```

Then in the UI, iterate over `availableFeeTypes` instead of `feeTypes`.

---

### 2. generateFeeCardPdf.ts

**Fix: Update PDF to show proper payment info**
```typescript
// In the grid building section, update paidRow logic:
// The PDF is VISUAL ONLY - it shows structure, not per-month payments
// Paid row stays as "-" because legacy doesn't track per-month payments
// The summary section shows actual totalPaid and balance

// Summary section already correctly shows:
// - Monthly Fee: data.monthlyAmount
// - Total Payable: monthlyAmount * 12
// - Total Paid: data.totalPaid
// - Balance Due: data.balance
```

The PDF is already mostly correct. The grid is visual-only per the plan.

---

## Summary of Changes

| Issue | Current | Fixed |
|-------|---------|-------|
| Default fee type | "Tuition" (doesn't exist) | Auto-select from available types |
| Fee types shown | All 20+ hardcoded types | Only types with fee structures |
| Balance for student 101 | 0 (wrong) | 20,000 (from Annual fee) |
| Receive Payment | Navigates away | Opens inline payment dialog |
| Payment recording | Broken (no student_fee) | Creates student_fee if needed |

---

## Technical Summary

**Files to modify:**
1. `src/pages/admin/StudentFeeCard.tsx`
   - Add payment dialog state and UI
   - Auto-select available fee types
   - Filter fee type checkboxes to available types only
   - Implement direct payment recording with auto-creation of student_fee record

2. `src/utils/generateFeeCardPdf.ts` (minimal changes)
   - PDF is already following the visual-only grid approach
   - May add highlighting for current month

**Database impact:**
- Creates `student_fees` records on first payment if none exist
- Appends to `fee_payments` for each payment received
- No schema changes required

