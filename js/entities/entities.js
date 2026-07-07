import { me } from '../melon.js';
import { game } from '../game.js';

// Entities are ES6 classes extending me.Sprite with a manually-attached me.Body
// (the supported v19 pattern; me.Entity is deprecated). The Sprite IS the renderable,
// so its animation/transform/alpha/size are accessed directly on `this` (not via a
// `this.renderable` child). Each constructor builds its body before the instance is
// added to me.game.world, which registers the body in the collision quadtree.
// Movement stays MANUAL (mutating `this.pos`) exactly as the v4 original; bodies exist
// only for collision detection, so gravityScale is 0 and body velocity is left at zero
// to keep the world physics solver from moving anything. Collision fires via the
// `onCollision(response, other)` hook the v19 world dispatches to any renderable with a
// body; returning false opts out of physical resolution (we resolve by game logic).

game.BirdEntity = class BirdEntity extends me.Sprite {
  constructor(x, y) {
    const settings = {};
    settings.image = 'clumsy';
    settings.width = 85;
    settings.height = 60;
    settings.framewidth = 85;
    settings.frameheight = 60;

    super(x, y, settings);
    // Gameplay entities use TOP-LEFT positioning: all the pipe/ground/bird
    // placement math is inherited unchanged from the melonJS v4 original, where
    // me.Entity positioned by its top-left corner. me.Sprite defaults to a
    // CENTER anchor (0.5, 0.5); leaving it centered shifts every entity up-left
    // by half its size (832px for the 1664px-tall pipes), which pushed the pipe
    // gap off the top of the screen and made the game unwinnable.
    this.anchorPoint.set(0, 0);
    this.body = new me.Body(this);
    this.body.addShape(new me.Ellipse(5, 5, 71, 51));
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.PLAYER_OBJECT;
    this.body.setCollisionMask(me.collision.types.ALL_OBJECT);
    this.alwaysUpdate = true;
    this.maxAngleRotation = me.math.degToRad(-30);
    this.maxAngleRotationDown = me.math.degToRad(35);
    this.addAnimation('flying', [0, 1, 2]);
    this.addAnimation('idle', [0]);
    this.setCurrentAnimation('flying');

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
    this.currentTransform.identity();
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
          that.currentTransform.rotate(that.maxAngleRotation);
        });
      this.angleTween.start();
    } else {
      this.gravityForce += 0.2;
      this.pos.y += me.timer.tick * this.gravityForce;
      this.currentAngle += me.math.degToRad(3);
      if (this.currentAngle >= this.maxAngleRotationDown) {
        this.currentTransform.identity();
        this.currentAngle = this.maxAngleRotationDown;
      }
    }
    this.currentTransform.rotate(this.currentAngle);
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
    // score + remove the invisible hit box. onCollision fires INSIDE melonJS
    // v19's live collision loop, which reads `other.body.isStatic` again right
    // after this handler returns. removeChildNow() is immediate: it destroys the
    // hit and nulls its .body synchronously, so that later read crashed with
    // "Cannot read properties of undefined (reading 'isStatic')" the moment the
    // bird reached the first pipe. Use the DEFERRED removeChild(), which melonJS
    // runs after the update/draw stack settles, so the body stays valid for the
    // rest of this frame's collision pass. The `scored` guard makes scoring
    // one-shot, since the hit now survives the extra frame(s) until the deferred
    // removal runs and could otherwise re-enter this handler.
    if (obj.type === 'hit' && !obj.scored) {
      obj.scored = true;
      me.game.world.removeChild(obj);
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
    this.currentTransform.identity();
    this.currentTransform.rotate(me.math.degToRad(90));
    const finalPos = me.game.viewport.height - this.width / 2 - 96;
    const dropTween = new me.Tween(this.pos)
      .easing(me.Tween.Easing.Exponential.InOut)
      .to({ y: finalPos }, { duration: 1000 })
      .onComplete(function () {
        me.state.change(me.state.GAME_OVER);
      });
    this.endTween.to({ y: currentPos }, { duration: 1000 }).chain(dropTween).start();
  }

  destroy(...args) {
    // The bird's collision shape is an me.Ellipse. melonJS v19's Body.destroy()
    // recycles Point/Line/Polygon shapes into dedicated pools but tries to
    // me.pool.push() any other shape with throwOnError=true. An Ellipse has no
    // onResetEvent, so it is never poolable and that push throws
    // ("me.pool: object ... cannot be recycled"), aborting the PLAY -> GAME_OVER
    // world reset and freezing the game. Detach the shapes before teardown so
    // the engine never attempts to recycle the un-poolable Ellipse.
    if (this.body) {
      this.body.shapes = [];
    }
    return super.destroy(...args);
  }
};

game.PipeEntity = class PipeEntity extends me.Sprite {
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
    this.anchorPoint.set(0, 0);
    this.body = new me.Body(this);
    this.body.addShape(new me.Rect(0, 0, settings.width, settings.height));
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.WORLD_SHAPE;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.alwaysUpdate = true;
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
      // Flip the bottom pipe so its cap points up. me.Sprite.flipY() reflects
      // around the sprite center at draw time (render-only), so with the
      // top-left anchor the pipe stays in place. currentTransform.scaleY(-1)
      // would instead reflect around the top edge and throw the pipe off-screen.
      // PipeEntity is pooled, so set the flip explicitly on BOTH pipes to keep a
      // recycled (previously-flipped) instance from carrying stale flip state.
      pipe1.flipY(true);
      pipe2.flipY(false);
      me.game.world.addChild(pipe1, 10);
      me.game.world.addChild(pipe2, 10);
      me.game.world.addChild(hit, 11);
    }
    return super.update(dt);
  }
};

game.HitEntity = class HitEntity extends me.Sprite {
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
    this.anchorPoint.set(0, 0);
    this.body = new me.Body(this);
    this.body.addShape(new me.Rect(0, 0, settings.width - 30, settings.height - 30));
    this.body.gravityScale = 0;
    // The hit box is a pure score trigger: mark it a sensor so v19's solver
    // never tries to push-out (respondToCollision) the invisible entity while it
    // waits to be removed. Collision detection (onCollision) still fires.
    this.body.setSensor(true);
    this.body.collisionType = me.collision.types.ACTION_OBJECT;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.alwaysUpdate = true;
    this.updateTime = false;
    this.alpha = 0;
    this.speed = -5;
    this.type = 'hit';
    // one-shot scoring guard (see BirdEntity.onCollision). Set per fresh
    // instance. HitEntity is registered without recycling and has no
    // onResetEvent, so me.pool never returns it to the pool: every
    // me.pool.pull('hit') constructs a new instance with scored === false.
    this.scored = false;
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

game.Ground = class Ground extends me.Sprite {
  constructor(x, y) {
    const settings = {};
    settings.image = me.loader.getImage('ground');
    settings.width = 900;
    settings.height = 96;
    settings.framewidth = 900;
    settings.frameheight = 96;
    super(x, y, settings);
    this.anchorPoint.set(0, 0);
    this.body = new me.Body(this);
    this.body.addShape(new me.Rect(0, 0, settings.width, settings.height));
    this.body.gravityScale = 0;
    this.body.collisionType = me.collision.types.WORLD_SHAPE;
    this.body.setCollisionMask(me.collision.types.PLAYER_OBJECT);
    this.alwaysUpdate = true;
    this.speed = -4;
    this.type = 'ground';
  }

  update(dt) {
    // mechanics
    this.pos.x += this.speed;
    if (this.pos.x < -this.width) {
      this.pos.x = me.game.viewport.width - 10;
    }
    this.updateBounds();
    return super.update(dt);
  }
};
