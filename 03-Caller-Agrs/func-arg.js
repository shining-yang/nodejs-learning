//
// Test function arguments passing.
// Shining, 2015-01-31
//

function A(obj) {
  obj.count = 1;
}

function B(obj) {
  A(obj);
  obj.message = 'Hello from B()';
}

(function Test() {
  var myObj = {
    name: 'YSN',
    age: 34,
    address: 'BJ'
  };

  console.log(myObj);
  B(myObj);
  myObj.count = 10;
  console.log(myObj);
})();


