import { me } from '../melon.js';
import { game } from '../game.js';

// v19: legacy `me.X.extend({...})` + `this._super(...)` is gone. Entities are ES6
// classes extending me.Entity (still provided, auto-creates `this.body`). Movement
// stays MANUAL (mutating `this.pos`) exactly as the v4 original; bodies exist only
// for automatic collision detection, so gravityScale is 0 and body velocity is left
// at zero to keep the world physics solver from moving anything. Collision fires via
// the legacy `onCollision(response, other)` hook the v19 world still dispatches;
// returning false opts out of physical resolution (we resolve by game logic).

game.BirdEntity = class BirdEntity extends me.Entity {
  constructor(x, y) {
    const settings = {};
    settings.image = 'clumsy';
    settings.width = 85;
    settings.height = 60;

    super(x, y, settings);
    this.alwaysUpdate = true;
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.PLAYER_OBJECT;
    this.body.setCollisionMask(me.collision.types.ALL_OBJECT);
    this.maxAngleRotation = me.math.degToRad(-30);
    this.maxAngleRotationDown = me.math.degToRad(35);
    this.renderable.addAnimation('flying', [0, 1, 2]);
    this.renderable.addAnimation('idle', [0]);
    this.renderable.setCurrentAnimation('flying');
    this.body.removeShapeAt(0);
    this.body.addShape(new me.Ellipse(5, 5, 71, 51));

    // a tween object for the flying physic effect
    this.flyTween = new me.Tween(this.pos);
    this.flyTween.easing(me.Tween.Easing.Exponential.InOut);

    this.currentAngle = 0;
    this.angleTween = new me.Tween(this);
    this.angleTween.easing(me.Tween.Easing.Exponential.InOut);

    // end animation tween
    this.endTween = null;

    // collision shape
    this.collided = false;

    this.gravityForce = 0.2;
  }

  update(dt) {
    const that = this;
    this.pos.x = 60;
    if (!game.data.start) {
      return super.update(dt);
    }
    this.renderable.currentTransform.identity();
    if (me.input.isKeyPressed('fly')) {
      me.audio.play('wing');
      this.gravityForce = 0.2;
      const currentPos = this.pos.y;

      this.angleTween.stop();
      this.flyTween.stop();

      this.flyTween.to({ y: currentPos - 72 }, { duration: 50 });
      this.flyTween.start();

      this.angleTween
        .to({ currentAngle: that.maxAngleRotation }, { duration: 50 })
        .onComplete(function () {
          that.renderable.currentTransform.rotate(that.maxAngleRotation);
        });
      this.angleTween.start();
    } else {
      this.gravityForce += 0.2;
      this.pos.y += me.timer.tick * this.gravityForce;
      this.currentAngle += me.math.degToRad(3);
      if (this.currentAngle >= this.maxAngleRotationDown) {
        this.renderable.currentTransform.identity();
        this.currentAngle = this.maxAngleRotationDown;
      }
    }
    this.renderable.currentTransform.rotate(this.currentAngle);
    this.updateBounds();

    const hitSky = -80; // bird height + 20px
    if (this.pos.y <= hitSky || this.collided) {
      game.data.start = false;
      me.audio.play('lose');
      this.endAnimation();
      return false;
    }
    return super.update(dt);
  }

  onCollision(response, other) {
    const obj = other;
    if (obj.type === 'pipe' || obj.type === 'ground') {
      me.device.vibrate(500);
      this.collided = true;
    }
    // remove the hit box
    if (obj.type === 'hit') {
      me.game.world.removeChildNow(obj);
      game.data.steps++;
      me.audio.play('hit');
    }
    // move manually: opt out of the physics solver's push-out response
    return false;
  }

  endAnimation() {
    me.game.viewport.fadeOut('#fff', 100);
    const currentPos = this.pos.y;
    this.endTween = new me.Tween(this.pos);
    this.endTween.easing(me.Tween.Easing.Exponential.InOut);

    this.flyTween.stop();
    this.renderable.currentTransform.identity();
    this.renderable.currentTransform.rotate(me.math.degToRad(90));
    const finalPos = me.game.viewport.height - this.renderable.width / 2 - 96;
    const dropTween = new me.Tween(this.pos)
      .easing(me.Tween.Easing.Exponential.InOut)
      .to({ y: finalPos }, { duration: 1000 })
      .onComplete(function () {
        me.state.change(me.state.GAME_OVER);
      });
    this.endTween.to({ y: currentPos }, { duration: 1000 }).chain(dropTween).start();
  }
};

game.PipeEntity = class PipeEntity extends me.Entity {
  constructor(x, y) {
    const image = me.loader.getImage('pipe');
    const settings = {};
    settings.image = image;
    settings.width = 148;
    settings.height = 1664;
    settings.framewidth = 148;
    settings.frameheight = 1664;

    super(x, y, settings);
    this.image = image;
    this.alwaysUpdate = true;
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.WORLD_SHAPE;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.speed = -5;
    this.type = 'pipe';
  }

  update(dt) {
    // mechanics
    if (!game.data.start) {
      return super.update(dt);
    }
    this.pos.x += this.speed;
    if (this.pos.x < -this.image.width) {
      me.game.world.removeChild(this);
    }
    this.updateBounds();
    return super.update(dt);
  }
};

game.PipeGenerator = class PipeGenerator extends me.Renderable {
  constructor() {
    super(0, me.game.viewport.width, me.game.viewport.height, 92);
    this.alwaysUpdate = true;
    this.generate = 0;
    this.pipeFrequency = 92;
    this.pipeHoleSize = 1240;
    this.posX = me.game.viewport.width;
  }

  update(dt) {
    if (this.generate++ % this.pipeFrequency == 0) {
      const posY = me.math.random(me.game.viewport.height - 100, 200);
      const posY2 = posY - me.game.viewport.height - this.pipeHoleSize;
      const pipe1 = me.pool.pull('pipe', this.posX, posY);
      const pipe2 = me.pool.pull('pipe', this.posX, posY2);
      const hitPos = posY - 100;
      const hit = me.pool.pull('hit', this.posX, hitPos);
      pipe1.renderable.currentTransform.scaleY(-1);
      me.game.world.addChild(pipe1, 10);
      me.game.world.addChild(pipe2, 10);
      me.game.world.addChild(hit, 11);
    }
    return super.update(dt);
  }
};

game.HitEntity = class HitEntity extends me.Entity {
  constructor(x, y) {
    const image = me.loader.getImage('hit');
    const settings = {};
    settings.image = image;
    settings.width = 148;
    settings.height = 60;
    settings.framewidth = 148;
    settings.frameheight = 60;

    super(x, y, settings);
    this.image = image;
    this.alwaysUpdate = true;
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.ACTION_OBJECT;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.updateTime = false;
    this.renderable.alpha = 0;
    this.speed = -5;
    this.body.removeShapeAt(0);
    this.body.addShape(new me.Rect(0, 0, settings.width - 30, settings.height - 30));
    this.type = 'hit';
  }

  update(dt) {
    // mechanics
    this.pos.x += this.speed;
    if (this.pos.x < -this.image.width) {
      me.game.world.removeChild(this);
    }
    this.updateBounds();
    return super.update(dt);
  }
};

game.Ground = class Ground extends me.Entity {
  constructor(x, y) {
    const settings = {};
    settings.image = me.loader.getImage('ground');
    settings.width = 900;
    settings.height = 96;
    super(x, y, settings);
    this.alwaysUpdate = true;
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.WORLD_SHAPE;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.speed = -4;
    this.type = 'ground';
  }

  update(dt) {
    // mechanics
    this.pos.x += this.speed;
    if (this.pos.x < -this.renderable.width) {
      this.pos.x = me.game.viewport.width - 10;
    }
    this.updateBounds();
    return super.update(dt);
  }
};
