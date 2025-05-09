import {
    Vector3,
} from "three";


const ActionMode = Object.freeze({
    WALK: "Walk",
    IDLE: "Idle",
    RUN: "Run",
});

class ControlKey {
    constructor() {
        this.action = {
            "FB": 0,//Front and back
            "LR": 0,//Left and right
            "UD": 0,//Up and down,
            "Run": 0,//Run or walk
        };

        this.hDirection = new Vector3();
        this.lastHDirection = new Vector3();
        this.vDirection = new Vector3();
    }

    getCurrentHorizontalDirection() {
        this.hDirection.set(this.action.LR, 0.0, this.action.FB);
        return this.hDirection;
    }
    getLastCurrentHorizontalDirection() {
        this.hDirection.set(this.action.LR, 0.0, this.action.FB);
        return this.hDirection;
    }

    getCurrentVerticalDirection() {
        this.vDirection.set(0.0, this.action.UD, 0.0);
        return this.vDirection;
    }

    getCurrentAction() {
        if (this.action.FB === 0 && this.action.LR === 0 && this.action.UD === 0) {
            return ActionMode.IDLE;
        }

        if (this.action.Run === 0) {
            return ActionMode.WALK;
        }
        return ActionMode.RUN;
    }

    isActive() {
        return this.action.FB !== 0 || this.action.LR !== 0 || this.action.UD !== 0;
    }

    isHorizontalActive() {
        return this.action.FB !== 0 || this.action.LR !== 0;
    }

    moveForward() {
        this.action.FB = -1;
        this.lastHDirection.setZ(this.action.FB);
    }

    moveBackward() {
        this.action.FB = 1;
        this.lastHDirection.setZ(this.action.FB);
    }

    moveLeft() {
        this.action.LR = -1;
        this.lastHDirection.setX(this.action.LR);
    }

    moveRight() {
        this.action.LR = 1;
        this.lastHDirection.setX(this.action.LR);
    }

    moveUp() {
        // this.action.LR = this.lastDirection.x;
        // this.action.FB = this.lastDirection.z;
        this.action.UD = 1;
    }

    moveDown() {
        // this.action.LR = this.lastDirection.x;
        // this.action.FB = this.lastDirection.z;
        this.action.UD = -1;
    }

    run() {
        this.action.Run = 1;
    }

    walk() {
        this.action.Run = 0;
    }

    /**
     * 停止前进，如果之前是前进则停止
     */
    stopForward() {
        this.lastHDirection.setZ(this.action.FB);
        if (this.action.FB < 0) {
            this.action.FB = 0;
        }
    }

    stopBackward() {
        this.lastHDirection.setZ(this.action.FB);
        if (this.action.FB > 0) {
            this.action.FB = 0;
        }
    }

    stopLeft() {
        this.lastHDirection.setX(this.action.LR);
        if (this.action.LR < 0) {
            this.action.LR = 0;
        }
    }

    stopRight() {
        this.lastHDirection.setX(this.action.LR);
        if (this.action.LR > 0) {
            this.action.LR = 0;
        }
    }

    stopUpDown(){
        this.action.UD = 0;
    }

    stopRun() {
        this.action.Run = 0;
    }
}
export { ControlKey };
export { ActionMode };
