// 선택된 게임 목록을 드래그하여 순서를 변경하는 클래스
export class DragManager {
  private draggedIndex: number | null = null;
  private onMove: (from: number, to: number) => void;

  constructor(onMove: (from: number, to: number) => void) {
    this.onMove = onMove;
  }

  startDrag(index: number) {
    this.draggedIndex = index;
  }

  drop(index: number) {
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      this.onMove(this.draggedIndex, index);
    }
    this.draggedIndex = null;
  }
}
