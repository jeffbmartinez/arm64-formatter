// Demonstrate the not instruction
lea   x0, leftOp
ldr   x1, [x0]
mvn   w1, w1  // Use 32-bit register
lea   x0, result
str   w1, [x0]

// Print the result
lea     x0, fmtStr4
vparm2  leftOp
vparm3  result
bl      printf
