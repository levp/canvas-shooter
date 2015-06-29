var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ICanHasAnonymousModule;
(function (ICanHasAnonymousModule) {
    "use strict";
    // Value of square root of 2
    const SQRT2 = Math.sqrt(2);
    // Value of pi times 2
    const TWO_PI = 2 * Math.PI;
    // Application entry point.
    function main() {
        const canvas = document.getElementById("game-canvas");
        const graphics = new Graphics(canvas.getContext("2d"));
        let firstTick = true;
        let lastTime;
        // The game loop which handles the timing of the game.
        function gameLoop(now) {
            if (firstTick) {
                firstTick = false;
                lastTime = now;
                // Initialize the game in the first game loop tick.
                Input.init(canvas);
                Game.init();
                return;
            }
            // Calculate elapsed time
            let elapsedSeconds = (now - lastTime) / 1000;
            lastTime = now;
            if (elapsedSeconds > 0.1) {
                // If the game is running at a REALLY low frame rate
                // then it will be unplayable regardless of anything
                // else. However, if the elapsed time is exceedingly
                // large, it might make the game break in unexpected
                // ways - this avoids such problems.
                elapsedSeconds = 0.1;
            }
            // Update the game
            Game.update(elapsedSeconds);
            // Render the next frame
            Game.render(graphics);
            // Update the input manager (must be done after the update).
            Input.update();
        }
        // Start the game loop
        function timer(now) {
            requestAnimationFrame(timer);
            gameLoop(now);
        }
        requestAnimationFrame(timer);
    }
    // Main game object, handles the overall state of the game.
    var Game;
    (function (Game) {
        // Width and of the game area, in pixels.
        Game.WIDTH = 800;
        // Height of the game area, in pixels.
        Game.HEIGHT = 600;
        let currentState;
        // Used by the FPS display
        let frameTime = 0;
        let frameCounter = 0;
        let frameRate = "?";
        // Initializes the game.
        function init() {
            setState(new MainMenu());
            BackgroundEffects.fillScreen();
        }
        Game.init = init;
        // Sets the state of the game.
        function setState(newState) {
            currentState = newState;
        }
        Game.setState = setState;
        // Updates the logic of the game.
        function update(elapsedSeconds) {
            // Update current state
            currentState.update(elapsedSeconds);
            // Update effects
            Effects.update(elapsedSeconds);
            BackgroundEffects.update(elapsedSeconds);
            // Update the FPS counter
            frameTime += elapsedSeconds;
            frameCounter++;
        }
        Game.update = update;
        // Renders the next frame of the game.
        function render(g) {
            // Clear last frame residues
            g.clear();
            // Render effects
            BackgroundEffects.render(g);
            Effects.render(g);
            // Render the current state
            currentState.render(g);
            // Draw the FPS counter
            if (frameTime >= 1) {
                frameRate = "" + Math.ceil(frameCounter / frameTime);
                frameTime = 0;
                frameCounter = 0;
            }
            g.drawText(frameRate, 4, 17, "white", "18px arial");
        }
        Game.render = render;
    })(Game || (Game = {}));
    // The main-menu state.
    var MainMenu = (function () {
        function MainMenu() {
        }
        // Updates the main menu.
        MainMenu.prototype.update = function (elapsedSeconds) {
            if (Input.justPressed(13 /* ENTER */)) {
                Game.setState(new GameState());
            }
        };
        // Renders the main menu.
        MainMenu.prototype.render = function (g) {
            g.drawTextCentered("Press [ENTER] to start the game.", Game.WIDTH / 2, 200, "white", "24px arial");
        };
        return MainMenu;
    })();
    var GameOverMenu = (function () {
        function GameOverMenu() {
        }
        // Override
        GameOverMenu.prototype.update = function (elapsedSeconds) {
            if (Input.justPressed(13 /* ENTER */)) {
                Game.setState(new MainMenu());
            }
        };
        // Override
        GameOverMenu.prototype.render = function (g) {
            g.drawTextCentered("Game over.", Game.WIDTH / 2, 200, "white", "18px arial");
            g.drawTextCentered("Press [ENTER] to return to the main menu.", Game.WIDTH / 2, 230, "white", "24px arial");
        };
        return GameOverMenu;
    })();
    // Presented to the player while the game is paused.
    var PauseMenu = (function () {
        function PauseMenu() {
        }
        // Updates the pause menu.
        PauseMenu.prototype.update = function (elapsedSeconds) {
            if (Input.isKeyDown(32 /* SPACE */)) {
            }
        };
        // Renders the pause menu.
        PauseMenu.prototype.render = function (g) {
            g.fillRect(0, 0, Game.WIDTH, Game.HEIGHT, "rgba(0, 0, 0, 0.4)");
            g.drawTextCentered("Press [P] to unpause the game.", Game.WIDTH / 2, 200, "white", "24px arial");
        };
        return PauseMenu;
    })();
    // This state manages the actual game itself.
    var GameState = (function () {
        function GameState() {
            // The player entity.
            this.player = new Player();
            // List of bullets currently in the game.
            this.bullets = new EntityList();
            // List of warpgates currently in the game.
            this.warpgates = new EntityList();
            // List of enemies currently in the game.
            this.enemies = new EntityList();
            // List of bullets fired by enemies.
            this.enemyBullets = new EntityList();
            // Timer used to spawn enemies.
            this.enemySpawnTimer = 0;
            this.paused = false;
        }
        // Add a bullet to the game.
        GameState.prototype.addBullet = function (bullet) {
            this.bullets.add(bullet);
        };
        // Add an enemy to the game.
        GameState.prototype.addEnemy = function (enemy) {
            this.enemies.add(enemy);
        };
        // Adds an enemy bullet to the game.
        GameState.prototype.addEnemyBullet = function (enemyBullet) {
            this.enemyBullets.add(enemyBullet);
        };
        // Gets the player entity.
        GameState.prototype.getPlayer = function () {
            return this.player;
        };
        // Updates the game state.
        GameState.prototype.update = function (elapsedSeconds) {
            if (Input.justPressed(80 /* P */)) {
                this.paused = !this.paused;
            }
            if (this.paused) {
                return;
            }
            // Update player
            this.player.update(elapsedSeconds, this);
            // Update player bullets
            this.bullets.updateAll(elapsedSeconds, this);
            // Spawn enemies
            this.enemySpawnTimer += elapsedSeconds;
            while (this.enemySpawnTimer > GameState.ENEMY_SPAWN_INTERVAL) {
                this.enemySpawnTimer -= GameState.ENEMY_SPAWN_INTERVAL;
                this.warpgates.add(new Warpgate(this.player));
            }
            // Update warpgates
            this.warpgates.updateAll(elapsedSeconds, this);
            // Update enemies
            this.enemies.updateAll(elapsedSeconds, this);
            // Update enemy bullets
            this.enemyBullets.updateAll(elapsedSeconds, this);
            // Collisions
            this.bullets.collideAll(this.enemies, function (bullet, enemy) {
                bullet.kill();
                enemy.takeDamage();
                enemy.vx += bullet.vx / 12;
                enemy.vy += bullet.vy / 12;
            });
            this.bullets.collideAll(this.enemyBullets, function (bullet, enemyBullet) {
                bullet.kill();
                enemyBullet.kill();
            });
            this.enemyBullets.collideWithOne(this.player, function (bullet, player) {
                bullet.kill();
                player.kill();
            });
            this.enemies.collideWithOne(this.player, function (enemy, player) {
                enemy.takeDamage();
                player.kill();
            });
            // Game over
            if (!this.player.alive) {
                Game.setState(new GameOverMenu());
            }
        };
        // Renders the game state.
        GameState.prototype.render = function (g) {
            // Render entities
            this.bullets.renderAll(g);
            this.enemies.renderAll(g);
            this.warpgates.renderAll(g);
            this.enemyBullets.renderAll(g);
            this.player.render(g);
            if (this.paused) {
                g.fillRect(0, 0, Game.WIDTH, Game.HEIGHT, "rgba(0, 0, 0, 0.4)");
                g.drawTextCentered("Press [P] to unpause the game.", Game.WIDTH / 2, 200, "white", "18px arial");
            }
        };
        // Determines how often enemies spawn.
        GameState.ENEMY_SPAWN_INTERVAL = 2;
        return GameState;
    })();
    // Base class for game entities.
    var Entity = (function () {
        function Entity() {
            // Indicates the current state of the entity; whether its alive of dead.
            this.alive = true;
            // X-coordinate of the entity's position,
            this.x = 0;
            // Y-coordinate of the entity's position,
            this.y = 0;
            // This dictates both the visual size and the collision size of the entity.
            this.radius = 25;
        }
        // Updates the state of the entity.
        Entity.prototype.update = function (elapsedSeconds, gs) {
        };
        // Kills the entity.
        Entity.prototype.kill = function () {
            this.alive = false;
            this.onDeath();
        };
        // Invoked when the enemy is killed.
        Entity.prototype.onDeath = function () {
        };
        // Renders the visuals of the entity.
        Entity.prototype.render = function (g) {
            g.fillCircle(this.x, this.y, this.radius, "magenta");
        };
        // Checks whether this entity collides with another entity.
        Entity.prototype.collidesWith = function (other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSqrd = dx * dx + dy * dy;
            const touchRadius = this.radius + other.radius;
            return (distSqrd <= touchRadius * touchRadius);
        };
        return Entity;
    })();
    // A collection of entities.
    var EntityList = (function () {
        function EntityList() {
            // Internally stores the entities.
            this.entities = [];
        }
        // Adds an entity to this list.
        EntityList.prototype.add = function (entity) {
            if (!(entity instanceof Entity)) {
                throw new Error("Invalid entity.");
            }
            if (this.entities.indexOf(entity) !== -1) {
                throw new Error("Duplicate entities not allowed.");
            }
            this.entities.push(entity);
        };
        // Updates all the entities in this list, removing entities that have died.
        EntityList.prototype.updateAll = function (elapsedSeconds, gs) {
            let entities = this.entities;
            for (let i = 0; i < entities.length; i++) {
                let entity = entities[i];
                entity.update(elapsedSeconds, gs);
                if (!entity.alive) {
                    entities.splice(i, 1);
                    i--;
                }
            }
        };
        // Renders all the entities in this list.
        EntityList.prototype.renderAll = function (g) {
            let entities = this.entities;
            for (let i = 0; i < entities.length; i++) {
                entities[i].render(g);
            }
        };
        // Performs collision checks between all the entities in this list and
        // all the entities of another list. When a collision is detected the
        // 'onCollide' function will be invoked, with the two colliding entities
        // passed to it as the two arguments.
        EntityList.prototype.collideAll = function (list, onCollide) {
            const entities = this.entities;
            if (entities.length === 0) {
                return;
            }
            const otherEntities = list.entities;
            if (otherEntities.length === 0) {
                return;
            }
            for (let i = 0; i < entities.length; i++) {
                const a = entities[i];
                for (let k = 0; k < otherEntities.length; k++) {
                    if (!a.alive) {
                        break;
                    }
                    const b = otherEntities[k];
                    if (!b.alive) {
                        continue;
                    }
                    if (a.collidesWith(b)) {
                        // A collision is detected!
                        onCollide(a, b);
                    }
                }
            }
        };
        // Performs collision checks between all the entities in this list and
        // another single entity.
        EntityList.prototype.collideWithOne = function (other, onCollide) {
            const entities = this.entities;
            for (var i = 0; i < entities.length; i++) {
                if (!other.alive) {
                    break;
                }
                var a = entities[i];
                if (!a.alive) {
                    continue;
                }
                if (a.collidesWith(other)) {
                    // Collision detected
                    onCollide(a, other);
                }
            }
        };
        return EntityList;
    })();
    // The player entity which is controlled by the actual player.
    var Player = (function (_super) {
        __extends(Player, _super);
        function Player() {
            _super.call(this);
            // Used to enforce player attack cooldown.
            this.attackTimer = 0;
            // Used for the Nova ability cooldown.
            this.novaTimer = 0;
            // Position the player at the center of the game area.
            this.x = Game.WIDTH / 2;
            this.y = Game.HEIGHT / 2;
        }
        // Updates the logic of the player.
        Player.prototype.update = function (elapsedSeconds, gs) {
            // Keyboard movement
            const speedDelta = Player.SPEED * elapsedSeconds;
            let vx = 0;
            let vy = 0;
            if (Input.isKeyDown(37 /* LEFT_ARROW */, 65 /* A */)) {
                vx -= speedDelta;
            }
            if (Input.isKeyDown(39 /* RIGHT_ARROW */, 68 /* D */)) {
                vx += speedDelta;
            }
            if (Input.isKeyDown(38 /* UP_ARROW */, 87 /* W */)) {
                vy -= speedDelta;
            }
            if (Input.isKeyDown(40 /* DOWN_ARROW */, 83 /* S */)) {
                vy += speedDelta;
            }
            // Diagonal movement
            if (vx !== 0 && vy !== 0) {
                // This avoids the player from moving quicker
                // overall when moving diagonally.
                vx /= SQRT2;
                vy /= SQRT2;
            }
            // Apply velocity
            this.x += vx;
            this.y += vy;
            // Prevent the player entity from leaving the game area
            const r = this.radius;
            const leftBorder = r;
            const rightBorder = Game.WIDTH - r;
            const topBorder = r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x < leftBorder) {
                this.x = leftBorder;
            }
            else if (this.x > rightBorder) {
                this.x = rightBorder;
            }
            if (this.y < topBorder) {
                this.y = topBorder;
            }
            else if (this.y > bottomBorder) {
                this.y = bottomBorder;
            }
            // Attack
            this.attackTimer -= elapsedSeconds;
            if (this.attackTimer <= 0 && Input.lmb) {
                this.attackTimer = Player.ATTACK_COOLDOWN;
                // Create a new bullet
                gs.addBullet(new Bullet(this.x, this.y, Input.mouseX, Input.mouseY));
            }
            // Nova ability
            this.novaTimer -= elapsedSeconds;
            if (this.novaTimer <= 0 && Input.isKeyDown(32 /* SPACE */)) {
                this.novaTimer = Player.NOVA_COOLDOWN;
                const angleDelta = TWO_PI / Player.NOVA_BULLET_COUNT;
                let movementAngle = 0;
                for (let i = 0; i < Player.NOVA_BULLET_COUNT; i++) {
                    // Calculate the movement angle of each bullet
                    const tx = this.x + Math.sin(movementAngle);
                    const ty = this.y + Math.cos(movementAngle);
                    // Create a bullet
                    gs.addBullet(new Bullet(this.x, this.y, tx, ty));
                    // Increment angle for next bullet
                    movementAngle += angleDelta;
                }
            }
        };
        // Make the player death seem dramatic.
        Player.prototype.onDeath = function () {
            Effects.explode(this.x, this.y, 200, "green", 3);
        };
        // Renders the visuals of the player.
        Player.prototype.render = function (g) {
            g.fillCircle(this.x, this.y, this.radius, "green");
        };
        // Speed of the player.
        Player.SPEED = 400;
        // Minimum amount of time between attacks.
        Player.ATTACK_COOLDOWN = 0.12;
        // Cooldown of the Nova ability.
        Player.NOVA_COOLDOWN = 5;
        // Number of bullets released by the Nova ability.
        Player.NOVA_BULLET_COUNT = 48;
        return Player;
    })(Entity);
    // A bullet fired by the player.
    var Bullet = (function (_super) {
        __extends(Bullet, _super);
        function Bullet(x, y, targetX, targetY) {
            _super.call(this);
            // Indicates whether the bullet has already bounced off the border once.
            // This is used to ensure that the bullet bounces once, and then dies
            // when it hits some border again.
            this.bounced = false;
            this.x = x;
            this.y = y;
            this.radius = 6;
            // Calculate velocity of bullet so that it moves
            // towards the target coordinate at the required
            // speed.
            const dx = targetX - x;
            const dy = targetY - y;
            const dd = Bullet.SPEED / Math.sqrt(dx * dx + dy * dy);
            // X-component of the bullet's velocity.
            this.vx = dx * dd;
            // Y-component of the bullet's velocity.
            this.vy = dy * dd;
        }
        // Updates the state of the bullet.
        Bullet.prototype.update = function (elapsedSeconds) {
            // Movement
            this.x += (this.vx * elapsedSeconds);
            this.y += (this.vy * elapsedSeconds);
            // Bullet touches the border of the game area.
            // First touch - bounce.
            // Second touch - bullet dies.
            //
            // Note: The current implementation allows the bullet
            // to bounce completely backwards if it hits a corner
            // and both vertical and horizontal borders are crossed
            // at the same time. This doesn't really detract from
            // the game, so for now a fix is not required.
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            let outside = false;
            if (this.x <= leftBorder) {
                // left
                if (this.vx < 0) {
                    this.vx *= -1;
                    this.x = leftBorder * 2 - this.x;
                    outside = true;
                }
            }
            else if (this.x >= rightBorder) {
                // right
                if (this.vx > 0) {
                    this.vx *= -1;
                    this.x = rightBorder * 2 - this.x;
                    outside = true;
                }
            }
            if (this.y <= topBorder) {
                // top
                if (this.vy < 0) {
                    this.vy *= -1;
                    this.y = topBorder * 2 - this.y;
                    outside = true;
                }
            }
            else if (this.y >= bottomBorder) {
                // bottom
                if (this.vy > 0) {
                    this.vy *= -1;
                    this.y = bottomBorder * 2 - this.y;
                    outside = true;
                }
            }
            if (outside) {
                if (this.bounced) {
                    this.kill();
                }
                else {
                    this.bounced = true;
                }
            }
        };
        // Add a bullet death effect.
        Bullet.prototype.onDeath = function () {
            Effects.explode(this.x, this.y, 10, "yellow", 1);
        };
        // Renders the visuals of the bullet.
        Bullet.prototype.render = function (g) {
            const ctx = g.ctx;
            ctx.fillStyle = "yellow";
            const x = this.x;
            const y = this.y;
            const width = 3;
            const height = 20;
            const angle = Math.atan2(this.vx, -this.vy);
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.rotate(-angle);
            ctx.translate(-x, -y);
        };
        // Speed of the bullet.
        Bullet.SPEED = 800;
        return Bullet;
    })(Entity);
    // An enemy entity the player must defeat.
    var Enemy = (function (_super) {
        __extends(Enemy, _super);
        function Enemy(x, y) {
            _super.call(this);
            // Current health of the enemy.
            this.health = 8;
            // Used for the attack cooldown.
            this.attackTimer = ut.rand(Enemy.ATTACK_COOLDOWN * 0.5, Enemy.ATTACK_COOLDOWN * 1.5);
            // Used to time the hit effect visual.
            this.hitTimer = 0;
            this.radius = 40;
            this.x = x;
            this.y = y;
            // Movement at a random direction.
            const speed = Enemy.START_SPEED;
            const dir = ut.rand(0, TWO_PI);
            this.vx = Math.sin(dir) * speed;
            this.vy = Math.cos(dir) * speed;
        }
        // Makes the enemy take 1 damage.
        Enemy.prototype.takeDamage = function () {
            // Lose health
            this.health--;
            // Reduce size
            this.radius *= Enemy.HIT_SIZE_FACTOR;
            if (this.health > 0) {
                // Hit effect
                this.hitTimer = Enemy.HIT_EFFECT_TIME;
            }
            else {
                // x_x
                this.kill();
            }
        };
        // Add a nice effect when the enemy dies.
        Enemy.prototype.onDeath = function () {
            Effects.explode(this.x, this.y, 80, "orange", 1.3);
        };
        // Update the logic of the enemy.
        Enemy.prototype.update = function (elapsedSeconds, gs) {
            // Movement
            this.x += this.vx * elapsedSeconds;
            this.y += this.vy * elapsedSeconds;
            // Enemies bounce off the game border.
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x <= leftBorder) {
                if (this.vx < 0) {
                    // left
                    this.vx *= -1;
                    this.x = leftBorder * 2 - this.x;
                }
            }
            else if (this.x >= rightBorder) {
                if (this.vx > 0) {
                    // right
                    this.vx *= -1;
                    this.x = rightBorder * 2 - this.x;
                }
            }
            if (this.y <= topBorder) {
                if (this.vy < 0) {
                    // top
                    this.vy *= -1;
                    this.y = topBorder * 2 - this.y;
                }
            }
            else if (this.y >= bottomBorder) {
                if (this.vy > 0) {
                    // bottom
                    this.vy *= -1;
                    this.y = bottomBorder * 2 - this.y;
                }
            }
            // Attacking
            this.attackTimer -= elapsedSeconds;
            if (this.attackTimer <= 0) {
                this.attackTimer += Enemy.ATTACK_COOLDOWN;
                gs.addEnemyBullet(new EnemyBullet(this.x, this.y, gs.getPlayer()));
            }
            // Hit effect timer
            this.hitTimer -= elapsedSeconds;
        };
        // Render the visuals of the enemy.
        Enemy.prototype.render = function (g) {
            const color = (this.hitTimer > 0) ? "red" : "orange";
            g.fillCircle(this.x, this.y, this.radius, color);
        };
        // Determines how much smaller the enemy is after getting hit once (percentage).
        Enemy.HIT_SIZE_FACTOR = 0.92;
        // Amount of time the visual hit effect lasts.
        Enemy.HIT_EFFECT_TIME = 0.06;
        // The speed at which the enemy starts at.
        Enemy.START_SPEED = 60;
        // Determines how often the enemy attacks.
        Enemy.ATTACK_COOLDOWN = 3;
        return Enemy;
    })(Entity);
    var EnemyBullet = (function (_super) {
        __extends(EnemyBullet, _super);
        function EnemyBullet(x, y, target) {
            _super.call(this);
            this.speedFactor = -1;
            this.radius = 12;
            this.x = x;
            this.y = y;
            const dx = target.x - x;
            const dy = target.y - y;
            const dd = EnemyBullet.SPEED / Math.sqrt(dx * dx + dy * dy);
            // X-component of the bullet's velocity.
            this.vx = dx * dd;
            // Y-component of the bullet's velocity.
            this.vy = dy * dd;
        }
        EnemyBullet.prototype.onDeath = function () {
            Effects.explode(this.x, this.y, 16, "red", 1.1);
        };
        EnemyBullet.prototype.update = function (elapsedSeconds, gs) {
            // Movement
            this.speedFactor += elapsedSeconds * 1.4;
            this.x += this.speedFactor * (this.vx * elapsedSeconds);
            this.y += this.speedFactor * (this.vy * elapsedSeconds);
            if (this.speedFactor <= 1) {
                return;
            }
            // Border collision
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x <= leftBorder || this.x >= rightBorder || this.y <= topBorder || this.y >= bottomBorder) {
                this.kill();
            }
        };
        EnemyBullet.prototype.render = function (g) {
            g.fillCircle(this.x, this.y, this.radius, "red");
        };
        EnemyBullet.SPEED = 180;
        return EnemyBullet;
    })(Entity);
    // The Warpgate serves as a warning sign before an enemy is spawned at its
    // its location.
    var Warpgate = (function (_super) {
        __extends(Warpgate, _super);
        function Warpgate(player) {
            _super.call(this);
            const r = Warpgate.INITIAL_SIZE;
            const px = player["x"];
            const py = player["y"];
            // Create the warp gate at a random place
            // within the bounds of the game-area and
            // far enough from the player.
            let x, y;
            let dx, dy;
            do {
                x = ut.randInt(r, Game.WIDTH - r);
                y = ut.randInt(r, Game.HEIGHT - r);
                dx = px - x;
                dy = py - y;
            } while (dx * dx + dy * dy < Warpgate.PLAYER_SAFE_DISTANCE_SQR);
            this.x = x;
            this.y = y;
            this.timeLeft = Warpgate.LIFETIME;
        }
        // Update the warpgate.
        Warpgate.prototype.update = function (elapsedSeconds, gs) {
            this.timeLeft -= elapsedSeconds;
            if (this.timeLeft <= 0) {
                this.alive = false;
                gs.addEnemy(new Enemy(this.x, this.y));
            }
        };
        // Render the warpgate.
        Warpgate.prototype.render = function (g) {
            const radius = Warpgate.INITIAL_SIZE * (this.timeLeft / Warpgate.LIFETIME);
            g.drawCircle(this.x, this.y, radius, "#cc00ff", 8);
        };
        // The initial size of the warpgate.
        Warpgate.INITIAL_SIZE = 40;
        // Lifetime of of the warpgate.
        Warpgate.LIFETIME = 1.5;
        // Minimum distance from the player that the warpgate can spawn, squared.
        Warpgate.PLAYER_SAFE_DISTANCE_SQR = 200 * 200;
        return Warpgate;
    })(Entity);
    // Manages the visual effects of the game.
    var Effects;
    (function (Effects) {
        // Lifetime range of particles.
        const MIN_LIFETIME = 0.3, MAX_LIFETIME = 0.7;
        // Speed range of particles
        const MIN_SPEED = 40, MAX_SPEED = 300;
        // Size range of the particles.
        const MIN_SIZE = 1, MAX_SIZE = 5;
        // A single particle used in particle effects.
        var Particle = (function () {
            function Particle() {
            }
            // Updates the state of the particle.
            Particle.prototype.update = function (elapsedSeconds) {
                // Lifetime
                this.lifetime -= elapsedSeconds;
                if (this.lifetime <= 0) {
                    // Particle ran out of time.
                    return false;
                }
                // Movement
                this.x += this.vx * elapsedSeconds;
                this.y += this.vy * elapsedSeconds;
                // Bounce off borders
                const r = this.size;
                const leftBorder = r;
                const topBorder = r;
                const rightBorder = Game.WIDTH - r;
                const bottomBorder = Game.HEIGHT - r;
                if (this.x <= leftBorder) {
                    if (this.vx < 0) {
                        // left
                        this.vx *= -1;
                        this.x = leftBorder * 2 - this.x;
                    }
                }
                else if (this.x >= rightBorder) {
                    if (this.vx > 0) {
                        // right
                        this.vx *= -1;
                        this.x = rightBorder * 2 - this.x;
                    }
                }
                if (this.y <= topBorder) {
                    if (this.vy < 0) {
                        // top
                        this.vy *= -1;
                        this.y = topBorder * 2 - this.y;
                    }
                }
                else if (this.y >= bottomBorder) {
                    if (this.vy > 0) {
                        // bottom
                        this.vy *= -1;
                        this.y = bottomBorder * 2 - this.y;
                    }
                }
                // Particle still lives
                return true;
            };
            return Particle;
        })();
        // Currently active particles.
        const activeParticles = [];
        // Dead particles that can be recycled later.
        const deadParticles = [];
        // Spawns multiple, randomly moving particles at the target location,
        // simulation an explosion.
        // The `intensity` argument affects how powerful the explosion is,
        // with values higher than 1 increasing the upper limits of the
        // lifetime, size, and speed of each particle and values lower than one
        // have the reverse effect.
        function explode(x, y, particleCount, color, intensity, direction) {
            for (let i = 0; i < particleCount; i++) {
                let ptc;
                // Create or recycle a particle.
                if (deadParticles.length > 0) {
                    ptc = deadParticles.pop();
                }
                else {
                    ptc = new Particle();
                }
                // Set particle position, color, lifetime, and size.
                ptc.x = x;
                ptc.y = y;
                ptc.color = color;
                ptc.lifetime = ut.rand(MIN_LIFETIME, MAX_LIFETIME * intensity);
                ptc.size = ut.randInt(MIN_SIZE, (MAX_SIZE + 1) * intensity);
                // Move in a random direction and at a random speed.
                const speed = ut.rand(MIN_SPEED, MAX_SPEED * intensity);
                let dir;
                if (typeof direction === 'number') {
                    dir = ut.rand(direction - 0.3, direction + 0.3);
                }
                else {
                    dir = ut.rand(0, TWO_PI);
                }
                ptc.vx = Math.sin(dir) * speed;
                ptc.vy = Math.cos(dir) * speed;
                // Add to active particle list.
                activeParticles.push(ptc);
            }
        }
        Effects.explode = explode;
        // Updates the effects.
        function update(elapsedSeconds) {
            const particles = activeParticles;
            for (let i = 0; i < particles.length; i++) {
                const ptc = particles[i];
                // Update
                const alive = ptc.update(elapsedSeconds);
                if (!alive) {
                    // Particle died; remove it from the active list
                    // and add it to the dead list so that it can be
                    // recycled at a later point.
                    particles.splice(i, 1);
                    i--;
                    deadParticles.push(ptc);
                }
            }
        }
        Effects.update = update;
        // Renders the effects.
        function render(g) {
            const particles = activeParticles;
            for (let i = 0; i < particles.length; i++) {
                const ptc = particles[i];
                const size = ptc.size;
                // Render the particle as a simple square
                g.fillRect(ptc.x - size / 2, ptc.y - size / 2, size, size, ptc.color);
            }
        }
        Effects.render = render;
    })(Effects || (Effects = {}));
    // Manages the background effects specifically.
    var BackgroundEffects;
    (function (BackgroundEffects) {
        const MIN_SPEED = 4;
        const MAX_SPEED = 40;
        const SPAWN_INTERVAL = 0.06;
        const deadDust = [];
        const activeDust = [];
        let dustTimer = 0;
        const COLORS = [
            "#a3a",
            "#a33",
            "#666",
            "#666",
            "#666",
            "#666",
            "#666",
            "#666",
            "#666",
            "#666",
            "#777",
            "#777",
            "#777",
            "#777",
            "#777",
            "#777",
            "#777",
            "#777",
            "#888",
            "#888",
            "#888",
            "#888",
            "#888",
            "#888",
            "#888",
            "#888",
            "#999",
            "#999",
            "#999",
            "#999",
            "#999",
            "#999",
            "#999",
            "#aaa",
            "#aaa",
            "#aaa",
            "#aaa",
            "#aaa",
            "#aaa",
            "#bbb",
            "#bbb",
            "#bbb",
            "#bbb",
            "#bbb",
            "#ccc",
            "#ccc",
            "#ccc",
            "#ccc",
            "#ddd",
            "#ddd",
            "#ddd",
        ];
        // Create/recycle a dust particle.
        function createDustParticle() {
            let ptc;
            if (deadDust.length > 0) {
                ptc = deadDust.pop();
            }
            else {
                ptc = {};
            }
            // Randomize the size of the particle
            let size;
            const seed = Math.random();
            if (seed < 0.93) {
                size = 1;
            }
            else if (seed < 0.99) {
                size = 2;
            }
            else {
                size = 3;
            }
            ptc.size = size;
            // Position randomly before the left border of the screen.
            ptc.x = -size;
            ptc.y = ut.rand(-size, Game.HEIGHT);
            // Particle speed
            ptc.speed = ut.rand(MIN_SPEED, MAX_SPEED);
            // Color
            ptc.color = ut.randElem(COLORS);
            activeDust.push(ptc);
        }
        // Fills the screen with dust particles.
        function fillScreen() {
            for (let i = 0; i < Game.WIDTH / MIN_SPEED; i++) {
                update(1);
            }
        }
        BackgroundEffects.fillScreen = fillScreen;
        // Updates the background effects.
        function update(elapsedSeconds) {
            // Create new dust particles, if its time
            dustTimer += elapsedSeconds;
            while (dustTimer >= SPAWN_INTERVAL) {
                dustTimer -= SPAWN_INTERVAL;
                createDustParticle();
            }
            // Update currently active particles
            const active = activeDust;
            for (let i = 0; i < active.length; i++) {
                const ptc = active[i];
                ptc.x += ptc.speed * elapsedSeconds;
                if (ptc.x > Game.WIDTH) {
                    active.splice(i, 1);
                    i--;
                    deadDust.push(ptc);
                }
            }
        }
        BackgroundEffects.update = update;
        // Renders the background effects.
        function render(g) {
            // <high performance area>
            const ctx = g.ctx;
            const active = activeDust;
            for (let i = 0; i < active.length; i++) {
                const ptc = active[i];
                const size = ptc.size;
                ctx.fillStyle = ptc.color;
                ctx.fillRect(ptc.x, ptc.y, size, size);
            }
        }
        BackgroundEffects.render = render;
    })(BackgroundEffects || (BackgroundEffects = {}));
    // Contains various utility methods.
    var ut;
    (function (ut) {
        // Generates a random integer between `min` (inclusive) and `max` (exclusive).
        function randInt(min, max) {
            return Math.floor(min + Math.random() * (max - min));
        }
        ut.randInt = randInt;
        // Generates a random numeric value between `min` and `max`.
        function rand(min, max) {
            return min + Math.random() * (max - min);
        }
        ut.rand = rand;
        // Returns a randomly selected element from an array.
        function randElem(array) {
            return array[Math.floor(Math.random() * array.length)];
        }
        ut.randElem = randElem;
    })(ut || (ut = {}));
    // Allows drawing simple 2D graphics on a Canvas element.
    var Graphics = (function () {
        function Graphics(ctx) {
            this.ctx = ctx;
        }
        // Clears the entire drawing canvas.
        Graphics.prototype.clear = function () {
            this.ctx.clearRect(0, 0, Game.WIDTH, Game.HEIGHT);
        };
        // Fills a square shape.
        Graphics.prototype.fillRect = function (x, y, width, height, color) {
            const ctx = this.ctx;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, width, height);
        };
        // Fills a circle shape.
        Graphics.prototype.fillCircle = function (centerX, centerY, radius, color) {
            const ctx = this.ctx;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, TWO_PI);
            ctx.fill();
        };
        // Draws the outline of a circle.
        Graphics.prototype.drawCircle = function (centerX, centerY, radius, color, lineWidth) {
            const ctx = this.ctx;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, TWO_PI);
            ctx.stroke();
        };
        // Draws text.
        Graphics.prototype.drawText = function (text, x, y, color, font) {
            const ctx = this.ctx;
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        };
        Graphics.prototype.drawTextCentered = function (text, x, y, color, font) {
            const ctx = this.ctx;
            ctx.font = font;
            ctx.fillStyle = color;
            const width = ctx.measureText(text).width;
            ctx.fillText(text, x - width / 2, y);
        };
        return Graphics;
    })();
    // Handles the keyboard and mouse input from the player.
    var Input;
    (function (Input) {
        // Maximum key code kept track of by the Input manager.
        const MAX_KEY_CODE = 128;
        // Key states from the last frame.
        const prevKeys = new Array(MAX_KEY_CODE);
        // Current key states.
        const currentKeys = new Array(MAX_KEY_CODE);
        Input.lmb = false;
        Input.mouseX;
        Input.mouseY;
        // The canvas element on which the game is drawn. A reference to this is
        // needed to properly calculate the position of the cursor relative to
        // the things in the game.
        let canvas;
        // Initializes the Input manager.
        function init(_canvas) {
            canvas = _canvas;
            // All the required keyboard and mouse listeners
            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
            window.addEventListener("mousedown", onMouseDown);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("mousemove", onMouseMove);
        }
        Input.init = init;
        // Updates the state of the Input manager. This must be called each frame
        // AFTER the game is updated. This is required to check when a key is
        // pressed for the first time in the current frame, as opposed to just
        // being held down by the player.
        function update() {
            for (let i = 0; i < MAX_KEY_CODE; i++) {
                prevKeys[i] = currentKeys[i];
            }
        }
        Input.update = update;
        // Returns true if at least one of the two specified keys (denoted by
        // their key codes) are down.
        function isKeyDown(keyCode1, keyCode2) {
            if (keyCode1 >= 0 && keyCode1 < MAX_KEY_CODE) {
                if (currentKeys[keyCode1])
                    return true;
            }
            if (keyCode2 >= 0 && keyCode2 < MAX_KEY_CODE) {
                if (currentKeys[keyCode2])
                    return true;
            }
            return false;
        }
        Input.isKeyDown = isKeyDown;
        // Checks whether a key has just been pressed in the current frame.
        function justPressed(keyCode) {
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                return currentKeys[keyCode] && !prevKeys[keyCode];
            }
            return false;
        }
        Input.justPressed = justPressed;
        // Handles the 'keydown' keyboard event.
        function onKeyDown(e) {
            let keyCode = e.keyCode;
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                currentKeys[keyCode] = true;
            }
        }
        // Handles the 'keyup' keyboard event.
        function onKeyUp(e) {
            let keyCode = e.keyCode;
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                currentKeys[keyCode] = false;
            }
        }
        // Handles the 'mousedown' mouse event.
        function onMouseDown(e) {
            if (e.button === 0) {
                Input.lmb = true;
            }
        }
        // Handles the 'mouseup' mouse event.
        function onMouseUp(e) {
            if (e.button === 0) {
                Input.lmb = false;
            }
        }
        // Handles the 'mousemove' mouse event.
        function onMouseMove(e) {
            Input.mouseX = e.clientX - canvas.offsetLeft;
            Input.mouseY = e.clientY - canvas.offsetTop;
        }
    })(Input || (Input = {}));
    // Contains key-code constants for keyboard keys.
    var KeyCode;
    (function (KeyCode) {
        KeyCode[KeyCode["LEFT_ARROW"] = 37] = "LEFT_ARROW";
        KeyCode[KeyCode["UP_ARROW"] = 38] = "UP_ARROW";
        KeyCode[KeyCode["RIGHT_ARROW"] = 39] = "RIGHT_ARROW";
        KeyCode[KeyCode["DOWN_ARROW"] = 40] = "DOWN_ARROW";
        KeyCode[KeyCode["W"] = 87] = "W";
        KeyCode[KeyCode["A"] = 65] = "A";
        KeyCode[KeyCode["S"] = 83] = "S";
        KeyCode[KeyCode["D"] = 68] = "D";
        KeyCode[KeyCode["P"] = 80] = "P";
        KeyCode[KeyCode["SPACE"] = 32] = "SPACE";
        KeyCode[KeyCode["ENTER"] = 13] = "ENTER";
    })(KeyCode || (KeyCode = {}));
    // Start the game once everything is loaded.
    window.addEventListener("load", main);
})(ICanHasAnonymousModule || (ICanHasAnonymousModule = {}));
//# sourceMappingURL=game.js.map