'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) { 
    if(!(vector instanceof Vector)) {
      throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
    } 
    return new Vector(this.x + vector.x, this.y + vector.y ); 
  }
  
  times(factor = 1) { 
    return new Vector(this.x * factor, this.y * factor); 
  }
}

class Actor {
  constructor(pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {
    if(!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
      throw new Error('Неверный тип данных');
    } 
    this.pos = pos;
    this.size = size;
    this.speed = speed; 
  }

  act() {}
    
  get left() {
    return this.pos.x; 
  }
  
  get top() {
    return this.pos.y;
  }
  
  get right() {
    return this.pos.x + this.size.x;
  }
  
  get bottom() {
    return this.pos.y + this.size.y;
  }
  
 get type() {
   return 'actor';
 }

 isIntersect(movingObject) {
   if(!(movingObject instanceof Actor)) {
     throw new Error('Неверный тип данных');
   } 
   if(movingObject === this) {
     return false;
   } 
   return (movingObject.left < this.right && movingObject.right > this.left && movingObject.top < this.bottom && movingObject.bottom > this.top);
 }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice(); 
    this.actors = actors.slice(); 
    this.player = this.actors.find(x => x.type === 'player' );
    this.height = this.grid.length; 
    this.width = Math.max(0, ...this.grid.map(x => x.length));
    this.status = null;
    this.finishDelay = 1;
  }
  
  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  
  actorAt(simpleActor) {
    if(!(simpleActor instanceof Actor)) {
      throw new Error('Неверный тип данных или undefined');
    }
    return this.actors.find(elements => simpleActor.isIntersect(elements));
  }
  
  obstacleAt(positionVector, sizeVector) {
    if(!(positionVector instanceof Vector) || !(sizeVector instanceof Vector)) {
      throw new Error('Неверный тип данных или undefined');
  }

  const actor = new Actor(positionVector, sizeVector);

  if (actor.bottom > this.height) {
    return 'lava';
  }

  if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
    return 'wall';
  }

  for (let i = Math.floor(actor.left); i < actor.right; i++) {
    for (let j = Math.floor(actor.top); j < actor.bottom; j++) {
    	const needI = this.grid[j][i];
      if (needI !== undefined) {
        return this.grid[j][i];
      }
    }
  }
  }
  
  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if(index !== -1) {
      this.actors.splice(index, 1);
    }
  }
  
  noMoreActors(type) {
    return !this.actors.some(elem => elem.type === type);
  }
  
  playerTouched(obstacle, coin) {
    if (this.status !== null) {
      return;
    } 

    if(obstacle === 'lava' || obstacle === 'fireball') {
      this.status = 'lost';
    } 

    if(obstacle === 'coin') {
      this.removeActor(coin);
      if(this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionaryObjects) { 
    this.dictionaryObjects = dictionaryObjects;
  }
  
  actorFromSymbol(symbolString = undefined) {
    if(this.dictionaryObjects !== undefined) {
      return this.dictionaryObjects[symbolString];
    } 
  }
  
  obstacleFromSymbol(symbolString = undefined) {
    if(symbolString ==='x') {
      return 'wall';
    } 
    if(symbolString === '!') {
      return 'lava';
    } 
  }
  
  createGrid(symbolString = []) {
		return symbolString.map(row => row.split('').map(symbol => this.obstacleFromSymbol(symbol)));
	}
  
  createActors(arr) {
    const actors = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr[i].length; j++) {
        const actor = this.actorFromSymbol(arr[i].charAt(j));
        if (typeof actor === 'function') {
          const instance = new actor(new Vector(j, i));
          if (instance instanceof Actor) {
            actors.push(instance);
          }
        }
      }
    }
    return actors;
  }

  parse(arr) {
   return new Level(this.createGrid(arr), this.createActors(arr));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0,0), speed = new Vector(0,0)) {
    super(pos, new Vector(1,1), speed);
  }
  
  get type() {
    return 'fireball';
  }
  
  getNextPosition(time = 1) { 
    return this.pos.plus(this.speed.times(time));
  }
  
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  
  act(time, playingField) { 
    const nextPosition = this.getNextPosition(time);
    if(playingField.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2,0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.initialPos = this.pos;
  }

  handleObstacle() {
    this.pos = this.initialPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.initialPos = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.initialPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
}

/*
const levels = [
    [
      '     v                 ',
      '                       ',
      '                       ',
      '                       ',
      '                       ',
      ' |                     ',
      ' o                  o  ',
      ' x                  x  ',
      ' x          o o  =  x  ',
      ' x  @       xxxxx   x  ',
      ' xxxxxx             x  ',
      '      x!!!!!!!!!!!!!x  ',
      '      xxxxxxxxxxxxxxx  ',
      '                       '
    ],

    [
      '     v      v                 |    v  v    v     ',
      '                 o       =                       ',
      '                 x                               ',
      '               =       o            o            ',
      '         o             x            x   =        ',
      ' |       x                                   o   ',
      ' o                  o          o    =   x    x   ',
      ' x                  x          x                 ',
      ' x          o o  =  x                x           ',
      ' x  @       xxxxx   x       o           =        ',
      ' xxxxxx                     x                    ',
      '      x!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!x   ',
      '      xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   ',
      '                                                 '
    ],
    
];

const parser = new LevelParser(actorDict);
  runGame(levels,parser,DOMDisplay)
  .then(() => alert('Вы выиграли приз!'));

*/

const parser = new LevelParser(actorDict);

loadLevels().then(levelsStr => {
  let levels = JSON.parse(levelsStr);
  return runGame(levels, parser, DOMDisplay);
}).then(() => {
  alert('Ты крут =) Победа твоя!')
});
















