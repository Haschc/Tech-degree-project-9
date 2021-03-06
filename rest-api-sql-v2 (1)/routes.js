'use strict';

const express = require('express');
const { authenticateUser } = require('./auth-user');
const { User } = require('./models');
const { Course } = require('./models');

const bcrypt = require('bcryptjs');
const course = require('./models/course');

const router = express.Router();

function asyncHandler(cb) {
  return async(req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (error) {
      console.log(error)
      res.status(500).send(error);
    }
  }
}

// Route that returns the current authenticated user.
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
  const user = req.currentUser;

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddress
  });
}));

// Route that creates a user
router.post('/users', asyncHandler(async (req, res) => {
  try {
    let user = req.body;
    
    if (user.password) {
      user.password = bcrypt.hashSync(user.password);
    }
    
    await User.create(user);
    res.status(201).location('/').end();
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });   
    } else {
      throw error;
    }
  }
}));

// Route that returns list of courses
router.get('/courses', asyncHandler(async (req, res) => {
  const courses = await Course.findAll();
  const users = await User.findAll();
  let coursesArr = [];
  
  for(let i = 0; i < courses.length; i++) {
    let userId = courses[i].userId - 1;
    let courseObj = {
      courseId: courses[i].id,
      title: courses[i].title,
      description: courses[i].description
    };

    let userObj = {
      id: users[userId].id,
      firstName: users[userId].firstName,
      lastName: users[userId].lastName,
      email: users[userId].emailAddress
    };
 
    if (courses[i].estimatedTime) {
      courseObj.estimatedTime = courses[i].estimatedTime;
    }
    if (courses[i].materialsNeeded) {
      courseObj.materialsNeeded = courses[i].materialsNeeded;
    }
    courseObj.userId = courses[i].userId;

    coursesArr.push(courseObj);
    coursesArr.push(userObj);
  }
  res.json(coursesArr);
}));

// Route returns specific course
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  const user = await User.findByPk(course.userId);
  let courseArr = [];

  let courseObj = {
    courseId: course.id,
    title: course.title,
    description: course.description
  };

  let userObj = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddress
  };

  if (course.estimatedTime) {
    courseObj.estimatedTime = course.estimatedTime;
  }
  if (course.materialsNeeded) {
    courseObj.materialsNeeded = course.materialsNeeded;
  }
  courseObj.userId = course.userId;

  courseArr.push(courseObj);
  courseArr.push(userObj);

  res.json(courseArr);
}));

// Route creates a course
router.post('/courses', authenticateUser, asyncHandler(async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).location(`/courses/${course.id}`).end();
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });   
    } else {
      throw error;
    }
  }
}));

// Route that updates a course
router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  const user = req.currentUser;
  let error = [];
  
  try {
    if (!req.body.title) {
      error.push("Please provide a title.");
    }
    if (!req.body.description) {
      error.push("Please provide a description.");
    }
    if (error.length > 0) {
      res.status(400).json({ error });
    }
    if (course) {
      if (user.id === course.userId) {
        await course.update(req.body);
        res.sendStatus(204);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });     
    }
  }
}));

// Route that deletes a course
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  const user = req.currentUser;

  console.log(user.id);
  if (course) {
    if (user.id === course.userId) {
      await course.destroy();
      res.sendStatus(204);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(404);
  }
}));

module.exports = router;