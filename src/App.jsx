import React, { useEffect, useMemo, useState } from "react";
import { HAYDAY_ITEMS } from "./data/haydayGoods";


/** =========================
 *  Kttermgame — Hay Day Shop
 *  Mobile-first prototype
 *  =========================
 *  - Qty step: 5/10/15/...
 *  - Default price: 5 pcs = 1 THB
 *  - Farm Tag required (text)
 *  - Copy order + open LINE OA
 *  - Decoration service: no price, redirect to LINE
 */

// CONFIG
const BRAND = "Kttermgame";
const TAGLINE = "จัดส่งไว • เปิดให้บริการมากกว่า 3 ปี";
const LINE_OA_ID = "@149iekag";
const LINE_OA_URL = "https://lin.ee/MgaS2aW";

// Price rule (you can change later)
const DEFAULT_PRICE_PER_5 = 1;

// Qty rule
const STEP = 5;
const MIN_QTY = 5;

// Categories (expand later)
const CATEGORIES = [
  { id: "farm", th: "ฟาร์ม", en: "Farm" },
  { id: "dairy", th: "โรงนม", en: "Dairy" },
  { id: "bakery", th: "เบเกอรี่", en: "Bakery" },
  { id: "sugar", th: "โรงน้ำตาล", en: "Sugar Mill" },
  { id: "tools", th: "อุปกรณ์", en: "Tools" },
  { id: "expand", th: "ของขยาย", en: "Expansion" },
];

// Demo items (replace img with Hay Day Wiki URLs; expand to 150+ later)



function clsx(...xs) { return xs.filter(Boolean).join(" "); }

function thb(n) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

function priceFromQty(qty, pricePer5 = DEFAULT_PRICE_PER_5) {
  return (qty / 5) * pricePer5;
}

function usePersisted(key, initial) {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

function Pill({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      className={clsx(
        "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
        active ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-gray-200 text-gray-700"
      )}>
      {children}
    </button>
  );
}

function Sheet({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md bg-white rounded-t-3xl shadow-2xl"
            initial={{ y: 520 }} animate={{ y: 0 }} exit={{ y: 520 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}>
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200" />
            <div className="px-5 pt-4 pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-extrabold text-gray-900">{title}</div>
                <button onClick={onClose} className="rounded-xl px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100">
                  ปิด
                </button>
              </div>
              <div className="mt-4">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QtyStepper({ value, disabled, onChange }) {
  const dec = () => {
    if (disabled) return;
    const next = Math.max(0, value - STEP);
    onChange(next);
  };
  const inc = () => {
    if (disabled) return;
    const next = value === 0 ? MIN_QTY : value + STEP;
    onChange(next);
  };
  return (
    <div className={clsx("flex items-center justify-between gap-2", disabled && "opacity-50")}>
      <button onClick={dec} className="h-10 w-10 rounded-2xl border border-gray-200 bg-white text-xl font-black text-gray-700 active:scale-95">−</button>
      <div className="min-w-[70px] text-center">
        <div className="text-xs font-semibold text-gray-500">Qty</div>
        <div className="text-lg font-extrabold text-gray-900">{value || 0}</div>
      </div>
      <button onClick={inc} className="h-10 w-10 rounded-2xl border border-emerald-600 bg-emerald-600 text-xl font-black text-white active:scale-95">+</button>
    </div>
  );
}

export default function App() {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  // cart: { [id]: qty }
  const [cart, setCart] = usePersisted("kt_cart_hayday", {});
  const [farmTag, setFarmTag] = usePersisted("kt_farm_tag", "");

  const [openCheckout, setOpenCheckout] = useState(false);
  const [openTagHelp, setOpenTagHelp] = useState(false);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter(it => {
      if (it.category !== activeCat) return false;
      if (inStockOnly && !it.inStock) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q) || it.nameTh.toLowerCase().includes(q);
    });
  }, [activeCat, query, inStockOnly]);

  const lines = useMemo(() => {
    return ITEMS.map(it => {
      const qty = cart[it.id] || 0;
      if (!qty) return null;
      const pricePer5 = (typeof it.pricePer5 === "number") ? it.pricePer5 : DEFAULT_PRICE_PER_5;
      const price = priceFromQty(qty, pricePer5);
      return { ...it, qty, price, pricePer5 };
    }).filter(Boolean);
  }, [cart]);

  const total = useMemo(() => lines.reduce((s, x) => s + x.price, 0), [lines]);
  const kinds = lines.length;

  const setQty = (id, qty) => {
    if (qty > 0 && qty < MIN_QTY) qty = MIN_QTY;
    setCart(prev => {
      const next = { ...prev };
      if (!qty) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const clearCart = () => setCart({});

  const copyText = useMemo(() => {
    const header = `รายการสั่งซื้อจาก ${BRAND}\n`;
    const body = lines.map(x => `• ${x.nameTh} (${x.name}) — ${x.qty} ชิ้น = ${thb(x.price)} บาท`).join("\n");
    const tail = `\n\nรวมราคา: ${thb(total)} บาท\n\nFarm Tag: ${farmTag || "#________"}\n\nรับของที่ Roadside Shop`;
    return `${header}\n${body}${tail}`;
  }, [lines, total, farmTag]);

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setToast("คัดลอกรายการแล้ว! ไปวางใน LINE ได้เลย");
      setTimeout(() => setToast(null), 2200);
    } catch {
      setToast("คัดลอกไม่สำเร็จ: อุปกรณ์บางรุ่นบล็อก — คัดลอกจากกล่องข้อความแทนได้");
      setTimeout(() => setToast(null), 2800);
    }
  };

  const validFarmTag = useMemo(() => {
    const t = (farmTag || "").trim();
    if (!t) return false;
    const cleaned = t.replace(/[^a-zA-Z0-9]/g, "");
    return cleaned.length >= 3;
  }, [farmTag]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md">
      {/* header */}   
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-gray-900">{BRAND}</div>
              <div className="mt-1 text-sm font-semibold text-gray-600">{TAGLINE}</div>
            </div>
            <a className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow active:scale-95"
               href={LINE_OA_URL} target="_blank" rel="noreferrer">
              LINE
            </a>
          </div>
          {/* Decoration service card */}
          <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold">★</div>
              <div className="flex-1">
                <div className="text-base font-extrabold text-gray-900">ปลดของตกแต่ง</div>
                <div className="mt-0.5 text-sm font-semibold text-gray-600">ทักไลน์เพื่อสอบถามรายละเอียด (ไม่แสดงราคา)</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-700">Premium Service</span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-700">3+ years</span>
                </div>
              </div>
            </div>
            <a href={LINE_OA_URL} target="_blank" rel="noreferrer"
               className="mt-4 block w-full rounded-2xl bg-gray-900 px-4 py-3 text-center text-sm font-extrabold text-white active:scale-[0.99]">
              ทัก LINE OA ({LINE_OA_ID})
            </a>
          </div>

          {/* search & toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="ค้นหา / Search"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
            />
            <button
              onClick={()=>setInStockOnly(v=>!v)}
              className={clsx(
                "rounded-2xl border px-4 py-3 text-sm font-extrabold",
                inStockOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-200 bg-white text-gray-700"
              )}>
              {inStockOnly ? "มีของ" : "ทั้งหมด"}
            </button>
          </div>

          {/* category pills */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <Pill key={c.id} active={activeCat===c.id} onClick={()=>setActiveCat(c.id)}>
                {c.th} / {c.en}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* product grid */}
      <div className="px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(it => {
            const qty = cart[it.id] || 0;
            const disabled = !it.inStock;
            const pricePer5 = (typeof it.pricePer5 === "number") ? it.pricePer5 : DEFAULT_PRICE_PER_5;
            return (
              <div key={it.id} className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="relative">
                  <img src={it.img} alt={it.name} className="h-28 w-full rounded-2xl object-contain bg-gray-50"
                       style={!it.inStock ? { filter:"grayscale(100%)", opacity:0.55 } : {}} />
                  
                  {!it.inStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-extrabold text-white">หมด / Out of stock</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-extrabold text-gray-900 leading-tight">{it.nameTh}</div>
                  <div className="text-xs font-semibold text-gray-500">{it.name}</div>
                  <div className="mt-1 text-xs font-extrabold text-emerald-700">5 ชิ้น = {thb(pricePer5)} บาท</div>
                </div>
                <div className="mt-3">
                  <QtyStepper value={qty} disabled={disabled} onChange={(v)=>setQty(it.id, v)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* spacer for sticky bar */}
        <div className="h-24" />
      </div>

      {/* Sticky summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md">
        <div className="px-4 pb-4">
          <div className="rounded-3xl bg-white shadow-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-500">Cart</div>
                <div className="text-sm font-extrabold text-gray-900">{kinds} รายการ • รวม {thb(total)} บาท</div>
              </div>
              <button
                onClick={() => setOpenCheckout(true)}
                disabled={kinds===0}
                className={clsx(
                  "rounded-2xl px-4 py-3 text-sm font-extrabold shadow active:scale-95",
                  kinds===0 ? "bg-gray-200 text-gray-500" : "bg-emerald-600 text-white"
                )}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating LINE button */}
      <a href={LINE_OA_URL} target="_blank" rel="noreferrer"
         className="fixed bottom-24 right-4 z-20 rounded-full bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl active:scale-95">
        LINE OA
      </a>

      {/* Checkout sheet */}
      <Sheet open={openCheckout} title="สรุปคำสั่งซื้อ / Checkout" onClose={()=>setOpenCheckout(false)}>
        {kinds===0 ? (
          <div className="text-sm font-semibold text-gray-600">ยังไม่มีรายการในตะกร้า</div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-600">รายการสั่งซื้อ</div>
              <div className="mt-2 space-y-2">
                {lines.map(x => (
                  <div key={x.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-gray-900 truncate">{x.nameTh}</div>
                      <div className="text-xs font-semibold text-gray-500 truncate">{x.name}</div>
                      <div className="text-xs font-semibold text-gray-500">Qty: {x.qty}</div>
                    </div>
                    <div className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{thb(x.price)}฿</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-gray-200 pt-3 flex items-center justify-between">
                <div className="text-sm font-extrabold text-gray-900">รวมทั้งหมด</div>
                <div className="text-lg font-black text-emerald-700">{thb(total)}฿</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-gray-900">Farm Tag</div>
                <button onClick={()=>setOpenTagHelp(true)} className="text-sm font-extrabold text-emerald-700">
                  ไม่รู้ดูตรงไหน?
                </button>
              </div>
              <input
                value={farmTag}
                onChange={(e)=>setFarmTag(e.target.value)}
                placeholder="#ABCD1234"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
              />
              {!validFarmTag && (
                <div className="mt-2 text-xs font-semibold text-amber-700">
                  กรุณากรอก Farm Tag (ตัวอักษร/ตัวเลข) เพื่อให้ร้านเตรียมของได้
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-600">ข้อความสำหรับส่ง LINE (คัดลอกได้)</div>
              <textarea
                value={copyText}
                readOnly
                rows={6}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-700"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={copyOrder}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white active:scale-95">
                Copy Order
              </button>
              <a href={LINE_OA_URL} target="_blank" rel="noreferrer"
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-extrabold text-white active:scale-95">
                ไป LINE OA
              </a>
            </div>

            <button onClick={clearCart}
              className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700 active:scale-95">
              ล้างตะกร้า
            </button>
          </>
        )}
      </Sheet>

      {/* Farm tag help */}
      <Sheet open={openTagHelp} title="วิธีดู Farm Tag" onClose={()=>setOpenTagHelp(false)}>
        <div className="text-sm font-semibold text-gray-700 leading-relaxed">
          1) เปิดเกม Hay Day แล้วแตะรูปโปรไฟล์มุมซ้ายบน<br/>
          2) ในหน้าข้อมูลฟาร์ม จะมีรหัสลักษณะ <span className="font-extrabold">#ABCD1234</span><br/>
          3) คัดลอกรหัสนี้มากรอกในช่อง Farm Tag แล้วส่งออเดอร์ใน LINE OA ได้เลย
        </div>
        <a href={LINE_OA_URL} target="_blank" rel="noreferrer"
           className="mt-4 block w-full rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-extrabold text-white active:scale-95">
          ทัก LINE OA
        </a>
      </Sheet>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed left-1/2 bottom-28 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white shadow-xl"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
