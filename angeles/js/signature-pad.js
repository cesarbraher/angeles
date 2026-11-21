/**
 * @project     ÁNGELES — Sistema Integral EHR & Gestión Clínica (PWA)
 * @institution Ángeles de Esperanza A.C. (Irapuato, Guanajuato)
 * @author      César Augusto Bravo Hernández
 * @role        CESAR A. BRAVO - DevRel @Google
 * @contact     cesarbraher@gmail.com | https://cebraher.com
 * @copyright   Todos los derechos reservados © 2026 César Augusto Bravo Hernández
 */

export class CapacitiveSignaturePad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.drawing = false;
    this.hasStrokes = false;
    this.lastPoint = null;
    this._setupCanvas();
    this._bindEvents();
  }

  _setupCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width || 500, 260);
    const h = Math.max(rect.height || 185, 160);
    this.canvas.width = w * ratio;
    this.canvas.height = h * ratio;
    this.ctx.scale(ratio, ratio);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = 2.4;
    this.ctx.strokeStyle = "#0F4C81";
  }

  _getPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  _bindEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.drawing = true;
      this.hasStrokes = true;
      this.lastPoint = this._getPoint(e);
      this.ctx.beginPath();
      this.ctx.arc(this.lastPoint.x, this.lastPoint.y, 1.2, 0, Math.PI * 2);
      this.ctx.fillStyle = "#0F4C81";
      this.ctx.fill();
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.drawing) return;
      e.preventDefault();
      const pt = this._getPoint(e);
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(pt.x, pt.y);
      this.ctx.stroke();
      this.lastPoint = pt;
    });

    const stop = () => {
      this.drawing = false;
      this.lastPoint = null;
    };
    this.canvas.addEventListener("pointerup", stop);
    this.canvas.addEventListener("pointercancel", stop);
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.hasStrokes = false;
  }

  isEmpty() {
    return !this.hasStrokes;
  }

  toDataURL() {
    if (this.isEmpty()) return null;
    return this.canvas.toDataURL("image/png");
  }
}
