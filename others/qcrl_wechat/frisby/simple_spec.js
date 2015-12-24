var frisby = require('frisby');
var apiURL = 'http://stage.itis6am.com/apiWXTeacher/v1/wxMain';

frisby.create('Test case 1: login')
  .post(apiURL, {
    account: 'testwl',
    password: 'e10adc3949ba59abbe56e057f20f883e',
    openId: 'my-random-openid',
    client: '1',
    method: 'login'
  }, {json: true})
  .expectStatus(200)
  .expectHeaderContains('Content-Type', 'application/json')
  .expectHeaderContains('Content-Type', 'utf-8')
  .expectJSON({
    code: 1,
    data: {openId: 'my-random-openid'}
  })
  .afterJSON(function (json) {
    frisby.create('Test case 2: getCourseInfo')
      .post(apiURL, {
        openId: json.data.openId,
        client: '1',
        method: 'getTeacherCourseInfo',
        orderStatus: '1',
        orderDate: '2015-10-28'
      }, {json: true})
      .expectStatus(200)
      .expectHeaderContains('Content-Type', 'application/json')
      .expectHeaderContains('Content-Type', 'utf-8')
      //.inspectJSON()
      .toss();
  })
  .toss();

