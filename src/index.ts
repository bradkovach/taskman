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

	print(input:Stringable): void {
		process.stdout.write(input.toString());
	}

	println(input:Stringable): void {
		process.stdout.write( input.toString() + '\n');
	}

	async run() {
		this.println(`Welcome to ${chalk.bold.green('TaskMan')}!`);

		const ip = '10.1.32.32',
			lineWidth = 41,
			rule = '-'.repeat(lineWidth);

		let printer = new nodeThermalPrinter.printer({
			type: nodeThermalPrinter.types.EPSON, // Printer type: 'star' or 'epson'
			interface: `tcp://${ip}`, // Printer interface
			width: lineWidth,
		});

		try {
			this.print(`Connecting to ${chalk.bold.white(ip)}... `);
			await printer.isPrinterConnected();
			await printer.execute();
			this.println(chalk.green('CONNECTED'));
		} catch (error) {
			this.println(chalk.red('NOT CONNECTED'));
			process.exit();
		}

		while (true) {
			const subject = await cli.prompt(
				chalk.bold.white('Subject'),
				{ required: false }
			);

			this.println('');

			this.println(
				this.prepend(
					chalk.bold.white(subject != '' ? subject : '(no subject)')
				)
			);

			this.println(
				this.prepend(chalk.grey(rule))
			);

			// Gather the lines of the note.
			const lines: string[] = [];
			do {
				const line = await cli.prompt('  ', {
					required: false,
				});
				lines.push(line);
			} while (!this.isEndOfNote(lines));

			this.println(
				this.prepend(chalk.grey(rule))
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
				command.print(printer);
			});

			// Send the job to the printer
			await printer.execute();

			// Clear the current printer buffer
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
		][date.getMonth()];

		return [date.getDate(), monthFmt, date.getFullYear()].join(
			' '
		);
	}

	formatTime(date: Date) {
		const hours = date.getHours(),
			mins = date.getMinutes(),
			hoursAmPm = [
				12, // 0, 12 => 12
				1, // 1, 13 => 1
				2, // 2, 14 => 2
				3, // 3, 15 => 3
				4, // 4, 16 => 4
				5, // 5, 17 => 5
				6, // 6, 18 => 6
				7, // 7, 19 => 7
				8, // 8, 20 => 8
				9, // 9, 21 => 9
				10, // 10, 22 => 10
				11, // 11, 23 => 11
			][hours % 12],
			// AM is 0-11, PM is 12-23
			amPm = hours < 12 ? 'AM' : 'PM',
			hoursFmt = this.zerofill(hoursAmPm),
			minsFmt = this.zerofill(mins);

		return `${hoursFmt}:${minsFmt} ${amPm}`;
	}

	zerofill(
		str: Stringable,
		length: number = 2,
		char: string = '0'
	) {
		if (char.length !== 1) {
			throw new Error(
				`Expected char to be a single character; provided '${char}'`
			);
		}
		return str.toString().padStart(length, char);
	}
}

export = TaskMan;
