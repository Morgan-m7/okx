export class GestureHandler {
  private startX = 0;
  private startY = 0;
  private startDistance = 0;
  private isPinching = false;
  private isPanning = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  onPinchStart: ((centerX: number, centerY: number, distance: number) => void) | null = null;
  onPinchMove: ((centerX: number, centerY: number, distance: number, scale: number) => void) | null = null;
  onPinchEnd: (() => void) | null = null;
  onPanStart: ((x: number, y: number) => void) | null = null;
  onPanMove: ((dx: number, dy: number) => void) | null = null;
  onPanEnd: (() => void) | null = null;
  onTap: ((x: number, y: number) => void) | null = null;
  onDoubleTap: ((x: number, y: number) => void) | null = null;
  onLongPress: ((x: number, y: number) => void) | null = null;

  handleTouchStart(touches: TouchList): void {
    if (touches.length === 2) {
      this.isPinching = true;
      this.isPanning = false;
      this.startDistance = this.getDistance(touches[0], touches[1]);
      const cx = (touches[0].clientX + touches[1].clientX) / 2;
      const cy = (touches[0].clientY + touches[1].clientY) / 2;
      this.onPinchStart?.(cx, cy, this.startDistance);
      this.clearLongPress();
    } else if (touches.length === 1) {
      this.isPanning = true;
      this.isPinching = false;
      this.startX = touches[0].clientX;
      this.startY = touches[0].clientY;
      this.onPanStart?.(this.startX, this.startY);

      this.longPressTimer = setTimeout(() => {
        this.onLongPress?.(this.startX, this.startY);
        this.longPressTimer = null;
      }, 500);
    }
  }

  handleTouchMove(touches: TouchList): void {
    if (this.isPinching && touches.length === 2) {
      const currentDistance = this.getDistance(touches[0], touches[1]);
      const scale = currentDistance / this.startDistance;
      const cx = (touches[0].clientX + touches[1].clientX) / 2;
      const cy = (touches[0].clientY + touches[1].clientY) / 2;
      this.onPinchMove?.(cx, cy, currentDistance, scale);
      this.startDistance = currentDistance;
      this.clearLongPress();
    } else if (this.isPanning && touches.length === 1) {
      const dx = touches[0].clientX - this.startX;
      const dy = touches[0].clientY - this.startY;
      this.startX = touches[0].clientX;
      this.startY = touches[0].clientY;
      this.onPanMove?.(dx, dy);
      this.clearLongPress();
    }
  }

  handleTouchEnd(touches: TouchList): void {
    if (this.isPinching) {
      this.isPinching = false;
      this.onPinchEnd?.();
    }
    if (this.isPanning) {
      this.isPanning = false;
      this.onPanEnd?.();
    }

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;

      const now = Date.now();
      const timeDiff = now - this.lastTapTime;
      const distDiff = Math.abs(this.startX - this.lastTapX) + Math.abs(this.startY - this.lastTapY);
      this.lastTapTime = now;
      this.lastTapX = this.startX;
      this.lastTapY = this.startY;

      if (timeDiff < 300 && distDiff < 30) {
        this.onDoubleTap?.(this.startX, this.startY);
        this.lastTapTime = 0;
      } else {
        this.onTap?.(this.startX, this.startY);
      }
    }
  }

  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  destroy(): void {
    this.clearLongPress();
    this.onPinchStart = null;
    this.onPinchMove = null;
    this.onPinchEnd = null;
    this.onPanStart = null;
    this.onPanMove = null;
    this.onPanEnd = null;
    this.onTap = null;
    this.onDoubleTap = null;
    this.onLongPress = null;
  }
}
