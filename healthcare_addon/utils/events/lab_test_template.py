
import random
def before_insert(doc, method)->None:
    doc.test_barcode = random.randint(10**11, 10**12 - 1)