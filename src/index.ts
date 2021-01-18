import { Command } from '@oclif/command';

import chalk from 'chalk';
import cli from 'cli-ux';
import * as nodeThermalPrinter from 'node-thermal-printer';

import {
	AppendCommand,
	BoldCommand,
	CenterCommand,
	CutCommand,
	LeftRightCommand,
	LinkCommand,
	NewLineCommand,
	NoopCommand,
	PrinterCommand,
	PrintLineCommand,
	QrCodeCommand,
	RuleCommand,
	TitleCommand,
	UnderlineCommand,
} from './commands';
import { lexer } from './lex';

interface Stringable {
	toString(): string;
}

class TaskMan extends Command {
	static description = 'describe the command here';

	static flags = {};

	static args = [];

	prepend(input: Stringable): string {
		return `${' '.repeat(4)}${input.toString()}`;
	}

	async run() {
		console.log(`Welcome to ${chalk.bold.green('TaskMan')}!`);

		const ip = '10.1.32.32',
			lineWidth = 41;

		let printer = new nodeThermalPrinter.printer({
			type: nodeThermalPrinter.types.EPSON, // Printer type: 'star' or 'epson'
			interface: `tcp://${ip}`, // Printer interface
			width: lineWidth,
		});

		try {
			console.log(`Connecting to ${chalk.bold.white(ip)}...`);
			await printer.isPrinterConnected();
			await printer.execute();
			console.log(chalk.green('CONNECTED'));
		} catch (error) {
			console.log(chalk.red('NOT CONNECTED'));
			process.exit();
		}

		while (true) {
			const subject = await cli.prompt(
				chalk.bold.white('Subject'),
				{ required: false }
			);
			console.log();
			console.log(
				this.prepend(
					chalk.bold.white(subject != '' ? subject : 'Task')
				)
			);
			console.log(
				this.prepend(chalk.grey('-'.repeat(lineWidth)))
			);

			// Gather the lines of the note.
			const lines: string[] = [];
			do {
				const line = await cli.prompt('  ', {
					required: false,
				});
				lines.push(line);
			} while (!this.isEndOfNote(lines));

			console.log(
				this.prepend(chalk.grey('-'.repeat(lineWidth)) + '\n')
			);

			// remove blank lines
			while (lines[lines.length - 1].trim() === '') {
				lines.pop();
			}

			const headCommands = [];

			if (subject.trim() !== '') {
				headCommands.push(
					new BoldCommand(subject.trim()),
					new NewLineCommand()
				);
			}

			// add the date
			const now = new Date();

			headCommands.push(
				new LeftRightCommand(
					this.formatTime(now),
					this.formatDate(now)
				)
			);

			const bodyCommands = lines
				.map((line) => this.tokenize(line))
				.reduce(
					(allCommands, currentCommands) => [
						...allCommands,
						...currentCommands,
					],
					[]
				);

			// Assemble commands and feed to the printer
			[
				...headCommands,
				new RuleCommand(true),
				...bodyCommands,
				new CutCommand(),
			].forEach((command) => {
				process.stdout.write(command.toString());
				command.print(printer)
			});

			await printer.execute();

			printer.clear();
		} // end of while loop
	}

	tokenize(line: string): PrinterCommand[] {
		try {
			lexer.input(line);
			return lexer.tokens().map((token) => {
				switch (token.type) {
					case 'word':
						return new AppendCommand(token.value);
					case 'ws':
						return new AppendCommand(token.value);
					case 'qr':
						return new QrCodeCommand(token.value);
					case 'title':
						return new TitleCommand(token.value);
					case 'bold':
						return new BoldCommand(token.value);
					case 'underline':
						return new UnderlineCommand(token.value);
					case 'hr':
						return new RuleCommand();
					case 'link':
						return new LinkCommand(
							token.value[0],
							token.value[1]
						);
					case 'center':
						return new CenterCommand(token.value);
					case 'newline':
					case 'EOF':
						return new NewLineCommand();
					default:
						return new NoopCommand();
				}
			});
		} catch (error) {
			return [new PrintLineCommand(line)];
		}
	}

	isEndOfNote(lines: string[]): boolean {
		if (lines.length > 2) {
			let penultimate = lines[lines.length - 2];
			let last = lines[lines.length - 1];
			if (penultimate.trim() === '' && last.trim() === '') {
				return true;
			}
		}
		return false;
	}

	formatDate(date: Date) {
		let month = date.getMonth();
		let monthFmt = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		][month];

		return [date.getDate(), monthFmt, date.getFullYear()].join(
			' '
		);
	}

	formatTime(date: Date) {
		const hours = date.getHours(),
			mins = date.getMinutes(),
			hoursAmPm =
				//prettier-ignore
				hours === 0 ? 12 // midnight hour should say 12
				: hours > 12 ? hours - 12 // convert 24 hr to 12 hr
				: hours, // 1-11
			AmPm = hours < 13 ? 'AM' : 'PM',
			hoursFmt = this.zerofill(hoursAmPm),
			minsFmt = this.zerofill(mins);

		return `${hoursFmt}:${minsFmt} ${AmPm}`;
	}

	zerofill(str: Stringable, length: number = 2) {
		return str.toString().padStart(length, '0');
	}
}

export = TaskMan;
