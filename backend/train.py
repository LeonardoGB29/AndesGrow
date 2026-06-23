"""primera fase: entrena el modelo y muestra como funciona.

ejecutar:  python train.py
descarga clima real de arequipa, genera datos con balance hidrico fao-56,
entrena el random forest, lo guarda y reporta metricas + importancia + ejemplos.
"""

from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from app.clima import cargar as cargar_clima
from app.model import entrenar, generar_datos, importancia

# 0) clima real (ET0 fao-56 + temperatura) de un valle de arequipa
clima = cargar_clima()
et0 = [d["et0"] for d in clima]
print(f"clima: {len(clima)} dias reales | ET0 {min(et0):.1f}–{max(et0):.1f} mm/dia\n")

# 1) datos sinteticos con fisica fao-56 (estado del suelo -> minutos de riego)
X, y = generar_datos()
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

# 2) entrena el random forest con el 80% y guarda el .pkl
rf = entrenar(Xtr, ytr)

# 3) que tan bien predice en datos que no vio
pred = rf.predict(Xte)
print(f"r2:  {r2_score(yte, pred):.3f}   (1.0 = perfecto)")
print(f"mae: {mean_absolute_error(yte, pred):.2f} min de error promedio\n")

# 4) que variable pesa mas en la decision
print("importancia de variables:")
for k, v in importancia().items():
    print(f"  {k:14s} {v}")

# Las inferencias se prueban con ventanas completas mediante predict_dataset.py.
