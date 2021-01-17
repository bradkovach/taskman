import { Command, flags } from '@oclif/command';
import chalk = require('chalk');
import * as nodeThermalPrinter from 'node-thermal-printer';

import cli from 'cli-ux';
import { lexer } from './lex';
import { Console } from 'console';

const epsonConfig = require('node-thermal-printer/lib/types/epson-config.js');

interface Stringable {
	toString(): string;
}

abstract class PrinterCommand {
	constructor() {}
	public abstract print(printer: nodeThermalPrinter.printer): void;
}

abstract class ControlCommand extends PrinterCommand {}

abstract class DataCommand extends ControlCommand {
	constructor(public data: string) {
		super();
	}
}

class ExecuteCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.execute();
	}
}

class NewLineCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.newLine();
	}
}

class CutCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {
		printer.cut();
	}
}

class NoopCommand extends ControlCommand {
	public print(printer: nodeThermalPrinter.printer): void {}
}

class AppendCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.append(this.data);
	}
}

class PrintLineCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.println(this.data);
	}
}

class Code128Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		// will throw an error
		// printer.code128(this.data);
		printer.printBarcode(this.data);
	}
}

class Code39Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.printBarcode(
			this.data,
			(Buffer.from([0x1d, 0x6b, 0x04]) as unknown) as number
		);
	}
}

class QrCodeCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.drawLine();
		printer.printQR(this.data);
		printer.print(this.data);
		printer.drawLine();
	}
}

class Pdf417Command extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.pdf417(this.data);
	}
}

class LinkCommand extends DataCommand {
	constructor(public linkText: string, public url: string) {
		super(url);
	}
	public print(printer: nodeThermalPrinter.printer): void {
		printer.printQR(this.url);
		printer.bold(true);
		printer.println(this.linkText);
		printer.bold(false);
		printer.println(this.url);
	}
}
class TitleCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.setTextQuadArea();
		printer.println(this.data);
		printer.setTextNormal();
	}
}

class BoldCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.bold(true);
		printer.append(this.data);
		printer.bold(false);
	}
}

class LeftRightCommand extends DataCommand {
	constructor(public left: string, public right: string) {
		super(left);
	}

	public print(printer: nodeThermalPrinter.printer): void {
		printer.leftRight(this.left, this.right);
	}
}

class UnderlineCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.underline(true);
		printer.append(this.data);
		printer.underline(false);
	}
}

class RuleCommand extends ControlCommand {
	constructor(public appendNewLine: boolean = false ) {
		super();
	}
	print(printer: nodeThermalPrinter.printer) {
		const width = printer.getWidth();
		printer.append( '-'.repeat(width) );
		if( this.appendNewLine ) {
			printer.newLine();
		}
	}
}
class CenterCommand extends DataCommand {
	print(printer: nodeThermalPrinter.printer) {
		printer.alignCenter();
		printer.println(this.data);
		printer.alignLeft();
	}
}

class TaskMan extends Command {
	static description = 'describe the command here';

	static flags = {};

	static args = [];

	async run() {
		console.log(`Welcome to ${chalk.bold.green('TaskMan')}!`);

		const ip = '10.1.32.32';
		const lineWidth = 41;

		let printer = new nodeThermalPrinter.printer({
			type: nodeThermalPrinter.types.EPSON, // Printer type: 'star' or 'epson'
			interface: `tcp://${ip}`, // Printer interface
			width: lineWidth,
		});

		try {
			console.log(`Connecting to ${chalk.bold.white(ip)}...`);
			let isConnected = await printer.isPrinterConnected();
			await printer.execute();
			console.log(chalk.green('CONNECTED'))
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
				'    ' +
					chalk.bold.white(subject != '' ? subject : 'Task')
			);
			console.log('    ' + chalk.grey('-'.repeat(lineWidth)));

			// Gather the lines of the note.
			const lines: string[] = [];
			do {
				const line = await cli.prompt('  ', {
					required: false,
				});
				lines.push(line);
			} while (!this.isEndOfNote(lines));

			console.log(
				'    ' + chalk.grey('-'.repeat(lineWidth)) + '\n'
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

			[
				...headCommands,
				new RuleCommand(true),
				...bodyCommands,
				new CutCommand(),
			].forEach((command) => command.print(printer));

			await printer.execute();

			printer.clear();
		}
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

		return [date.getDate(), monthFmt, date.getFullYear()].join(' ');
	}

	formatTime(date: Date) {
		let hours = date.getHours();
		let mins = date.getMinutes();

		let hoursFmt =
			hours === 0 ? 12 
			: hours > 12 ? hours - 12 // convert 24 hr to 12 hr
			: hours; // 1-11
		let AmPm = hours < 13 ? 'AM' : 'PM';

		return `${this.zerofill(hoursFmt, 2)}:${this.zerofill(
			mins,
			2
		)} ${AmPm}`;
	}

	zerofill(str: Stringable, length: number) {
		return str.toString().padStart(length, '0');
	}
}

export = TaskMan;
