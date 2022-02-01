#!/usr/bin/env node

const chalk = require('chalk')
const chalkAnimation = require('chalk-animation')
const createSpinner = require('nanospinner').createSpinner
const axios = require('axios')
const { prompt } = require('enquirer')

const sleep = (ms = 300) => new Promise((r) => setTimeout(r, ms))

const opendbUrl = 'https://opentdb.com/api.php'

async function main () {
  try {
    await welcome()
  } catch (e) {
    console.error('Error occured')
  }
}

main()

async function welcome () {
  const rainbowTitle = chalkAnimation.rainbow(
    'Welcome to cmd quiz'
  )
  await sleep(300)
  rainbowTitle.stop()

  const { player } = await askName()
  start(player)
}

async function start (player) {
  const { category } = await chooseCategory()
  const { difficulty } = await chooseDifficulty()
  const { type } = await selectType()

  const qa = await getQAs({ category, difficulty, type })

  const noOfQuestions = qa.length
  let score = 0
  for (let i = 0; i < noOfQuestions; i++) {
    const questionNo = i + 1
    const question = generateQuestion(qa[i], questionNo, noOfQuestions)
    const { userChoice } = await prompt(question)
    if (userChoice.correct) {
      score++
      console.log('✅ ' + chalk.green('Congrats!, that was the correct answer') + '\n')
    } else {
      console.log('❌ ' + chalk.red('Oops, that was incorrect') + '\n' +
      chalk.yellow('Correct answer is ') + chalk.green(`${userChoice.correctAnswer}`) + '\n')
    }
  }

  if (score === 0) {
    console.log(chalk.magenta(`Your score is 0, Don't worry, try again ${player}. All the best! 👍\n`))
  } else if (score === noOfQuestions) {
    console.log(chalk.magenta(`🎉🎊 Congrats ${player}, you have answered all questions correctly\n`))
  } else {
    console.log(chalk.magenta(`🎉 Well done ${player}, Your score is ${score}/${noOfQuestions}. \nTry again and improve your score 🙂\n`))
  }
  const { retry } = await tryAgain()

  if (retry) {
    start()
  } else {
    console.log('👋 Bye!')
    process.exit(0)
  }
}

async function tryAgain () {
  const response = await prompt({
    message: 'Try Again?',
    type: 'Confirm',
    name: 'retry',
    initial: true
  })
  return response
}

async function askName () {
  const response = await prompt({
    message: chalk.green('What is your name?'),
    type: 'input',
    name: 'player',
    initial: 'player'
  })
  return response
}

async function chooseCategory () {
  const answer = await prompt({
    message: chalk.green('Choose a category'),
    type: 'Select',
    name: 'category',
    choices: [
      'Any',
      'General Knowledge',
      'Science & Nature',
      'Science: Computers',
      'Science: Mathematics',
      'Science: Gadgets',
      'Mythology',
      'History'
    ],
    result (val) {
      return categoryMap[val]
    }
  })
  return answer
}

async function chooseDifficulty () {
  const answer = await prompt({
    message: chalk.green('Choose difficulty level'),
    type: 'Select',
    name: 'difficulty',
    choices: [
      'Any',
      'Easy',
      'Medium',
      'Hard'
    ],
    result (val) {
      return difficultyMap[val]
    }
  })
  return answer
}

async function selectType () {
  const answer = await prompt({
    message: chalk.green('Select the type of questions'),
    type: 'Select',
    name: 'type',
    choices: [
      'Any',
      'Multiple Choices',
      'True/ False'
    ],
    result (val) {
      return typeMap[val]
    }
  })
  return answer
}

function getParams ({ category, difficulty, type }) {
  const queryParameters = {
    amount: 10,
    encode: 'url3986'
  }

  if (category && category !== 'Any') {
    queryParameters.category = category
  }
  if (difficulty && difficulty !== 'Any') {
    queryParameters.difficulty = difficulty
  }
  if (type && type !== 'Any') {
    queryParameters.type = type
  }
  return { params: queryParameters }
}

function generateQuestion (question, i, n) {
  let answerOptions = []
  if (question.type === 'boolean') {
    answerOptions = [
      'True',
      'False'
    ]
  } else {
    answerOptions = shuffle([
      ...question.incorrect_answers,
      question.correct_answer
    ])
  }

  // decode answers
  answerOptions = answerOptions.map(x => decodeURIComponent(x))
  const correctAnswer = decodeURIComponent(question.correct_answer)

  return {
    type: 'quiz',
    name: 'userChoice',
    message: `${i}/${n} ` + chalk.blue(decodeURIComponent(question.question)),
    choices: answerOptions,
    correctChoice: answerOptions.indexOf(correctAnswer)
  }
}

function shuffle (array) {
  let currentIndex = array.length
  let randomIndex

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]]
  }

  return array
}

async function getQAs (options) {
  const spinner = createSpinner(chalk.green('Fetching questions from opendb...')).start()
  const response = await axios.get(opendbUrl, getParams(options))
    .then(response => {
      if (response.data.response_code === 0) {
        spinner.success({ text: chalk.green('Questions are ready') })
        return response
      } else {
        spinner.error({ text: chalk.red('Error occured while fetching questions') })
        process.exit(1)
      }
    })
    .catch(e => {
      spinner.error({ text: chalk.red('Error occured while fetching questions') })
      process.exit(1)
    })
  return response.data.results
}

const categoryMap = {
  Any: 'Any',
  'General Knowledge': '9',
  'Science & Nature': '17',
  'Science: Computers': '18',
  'Science: Mathematics': '19',
  'Science: Gadgets': '30',
  Mythology: '20',
  History: '23'
}

const difficultyMap = {
  Any: 'Any',
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard'
}

const typeMap = {
  Any: 'Any',
  'Multiple Choices': 'multiple',
  'True/ False': 'boolean'
}
